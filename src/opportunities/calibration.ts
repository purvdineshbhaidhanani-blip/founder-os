import type {
  CalibrationAggregate,
  CalibrationDiagnosticFlag,
  CalibrationExplainability,
  CalibrationFalsePositive,
  CalibrationFoisBucket,
  CalibrationMetrics,
  CalibrationRanking,
  FoisBreakdown,
  FounderOpportunityReport,
  OpportunityCalibration,
  ProblemIntelligenceReport,
  ResearchSession,
  ThresholdDiagnostic,
} from "./types.js";

/**
 * Loop 4 — Calibration & Diagnostics layer.
 *
 * This module CALIBRATES and VALIDATES the scores already computed
 * elsewhere in src/opportunities (fois.ts, decision.ts) and src/problems —
 * it never changes them. Every export here is a pure, read-only function of
 * fields already present on a FounderOpportunityReport / TopOpportunitiesReport
 * / ResearchSession / ProblemIntelligenceReport. No LLM call, no new
 * randomness, no re-derivation of clustering, FOIS, or the Founder Decision
 * layer. Nothing computed here is fed back into `fois.overall`, the shipped
 * `opportunities` array's order, or `decision.recommendation.verdict` — see
 * each function's doc for the exact (documented, fixed) formula.
 *
 * Two threshold constants below (FOIS_BUILD_THRESHOLD_MIRROR,
 * FOIS_IGNORE_THRESHOLD_MIRROR) intentionally duplicate module-private
 * constants of the same value already defined in decision.ts
 * (FOIS_BUILD_THRESHOLD / FOIS_IGNORE_THRESHOLD). decision.ts is a
 * READ-ONLY input per the Loop 4 mission (must not be modified, not even to
 * add an `export`), so this is a deliberate, documented mirror — if
 * decision.ts's thresholds ever change, this mirror must be updated in
 * lockstep, or the two modules will silently drift. Same reasoning applies
 * to NO_SIGNAL_PENALTY_MARKER, which mirrors decision.ts's
 * NO_SIGNAL_PENALTY_REASON_MARKER.
 */

/** Mirrors decision.ts's private FOIS_BUILD_THRESHOLD. */
const FOIS_BUILD_THRESHOLD_MIRROR = 60;
/** Mirrors decision.ts's private FOIS_IGNORE_THRESHOLD. */
const FOIS_IGNORE_THRESHOLD_MIRROR = 35;
/** Mirrors fois.ts's computePenalties "no meaningful pain + no buying intent" penalty reason substring. */
const NO_SIGNAL_PENALTY_MARKER = "passive/news-only";

/** A FOIS dimension's `raw` score must reach this to count as an independently-fired signal (Part A signalDensity, Part B Artificial Score Inflation). */
const SIGNAL_DENSITY_RAW_THRESHOLD = 40;
/** Mirrors fois.ts's own NO_PAIN_THRESHOLD / WEAKNESS_RAW_THRESHOLD value (both 30 there) — below this, businessPain's raw score is treated as "no meaningful pain". */
const LOW_PAIN_RAW_THRESHOLD = 30;
/** Below this buying-intent score, "Weak Buying Intent" fires (Part B) and Speculation's approximation applies. */
const WEAK_BUYING_INTENT_THRESHOLD = 0.2;
/** Below this many unique sources, "Low Diversity" fires (Part B). */
const LOW_DIVERSITY_MIN_SOURCES = 2;
/** evidenceCount at or below this fires "Single Mention" (Part B). */
const SINGLE_MENTION_MAX_EVIDENCE = 1;
/** uniqueAuthors at or below this fires "Sparse Cluster" (Part B). */
const SPARSE_CLUSTER_MAX_AUTHORS = 1;
/** fois.overall reaching BUILD threshold with at most this many independently-fired dimensions (raw >= SIGNAL_DENSITY_RAW_THRESHOLD) fires "Artificial Score Inflation" — a reasoned, not empirically tuned, choice: one lucky dimension should not be enough to justify a BUILD-band score. */
const ARTIFICIAL_INFLATION_MAX_FIRED_DIMENSIONS = 1;

/** Distance (in fois.overall points) from the nearest BUILD/IGNORE boundary at which rankingStability is treated as fully stable (1.0) — the width of the WATCH band itself (60-35), a natural, documented scale rather than an arbitrary one. */
const STABILITY_NORMALIZER = FOIS_BUILD_THRESHOLD_MIRROR - FOIS_IGNORE_THRESHOLD_MIRROR;

/** Part G advisory thresholds — see computeThresholdDiagnostic. Reasoned defaults, not empirically tuned (no labeled founder-outcome dataset was available, mirroring every other threshold in this codebase). */
const NEAR_MISS_WINDOW_POINTS = 5;
const NEAR_MISS_MIN_EVIDENCE = 5;
const LENIENT_ACCEPT_PCT_THRESHOLD = 70;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Mean of a number array; 0 for an empty array (never NaN, never fabricated). */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/* ------------------------------------------------------------------------ */
/* Small, shared, read-only lookups over an existing FoisBreakdown          */
/* ------------------------------------------------------------------------ */

function dimensionRaw(fois: FoisBreakdown, name: string): number {
  return fois.dimensions.find((dim) => dim.name === name)?.raw ?? 0;
}

/**
 * Reads the growth label already embedded in fois.ts's "frequency"
 * dimension `evidence` array (`growth=${cluster.frequency.growth.label}`,
 * see fois.ts's computeFrequencyDimension) rather than re-deriving it from
 * the source ProblemCluster (which this module never reads directly).
 * Falls back to "unknown" (never guessed) if the entry is absent.
 */
function growthLabelOf(fois: FoisBreakdown): string {
  const dim = fois.dimensions.find((d) => d.name === "frequency");
  const entry = dim?.evidence.find((e) => e.startsWith("growth="));
  return entry ? entry.slice("growth=".length) : "unknown";
}

/* ------------------------------------------------------------------------ */
/* Part A — per-opportunity calibration metrics                             */
/* ------------------------------------------------------------------------ */

/**
 * Every dimension is a pure, documented, guarded (never divide-by-zero)
 * function of fields already computed on `report` — see CalibrationMetrics'
 * field docs (types.ts) for the exact formula per metric.
 */
export function computeCalibrationMetrics(report: FounderOpportunityReport): CalibrationMetrics {
  const { fois, decision, semanticCluster } = report;

  const distanceToNearestBoundary = Math.min(
    Math.abs(fois.overall - FOIS_BUILD_THRESHOLD_MIRROR),
    Math.abs(fois.overall - FOIS_IGNORE_THRESHOLD_MIRROR),
  );
  const rankingStability = clamp(distanceToNearestBoundary / STABILITY_NORMALIZER, 0, 1);

  const firedDimensionCount = fois.dimensions.filter((dim) => dim.raw >= SIGNAL_DENSITY_RAW_THRESHOLD).length;
  const signalDensity = fois.dimensions.length === 0 ? 0 : firedDimensionCount / fois.dimensions.length;

  const uniqueSources = decision.evidence.uniqueSources;
  const evidenceDensity = decision.evidence.evidenceCount / Math.max(1, uniqueSources);
  const crossSourceConsistency = clamp(decision.evidence.crossSourceAgreement / Math.max(1, uniqueSources), 0, 1);

  const intentConsistency = decision.intentDistribution[0]?.fraction ?? 0;

  const penaltyPoints = fois.penalties.reduce((sum, p) => sum + p.points, 0);
  const noiseDenominator = fois.overall + penaltyPoints;
  const noiseRatio = noiseDenominator === 0 ? 0 : penaltyPoints / noiseDenominator;

  const mergedCount = semanticCluster.mergedCount;
  const duplicateCompressionRatio = mergedCount <= 1 ? 0 : (mergedCount - 1) / mergedCount;

  return {
    rankingStability,
    signalDensity,
    evidenceDensity,
    crossSourceConsistency,
    intentConsistency,
    noiseRatio,
    duplicateCompressionRatio,
  };
}

/* ------------------------------------------------------------------------ */
/* Part B — quality diagnostics flags                                       */
/* ------------------------------------------------------------------------ */

export function computeCalibrationDiagnostics(
  report: FounderOpportunityReport,
  metrics: CalibrationMetrics,
): CalibrationDiagnosticFlag[] {
  const { fois, decision, buyingIntent } = report;
  const evidenceCount = decision.evidence.evidenceCount;
  const uniqueSources = decision.evidence.uniqueSources;
  const uniqueAuthors = decision.evidence.uniqueAuthors;
  const businessPainRaw = dimensionRaw(fois, "businessPain");
  const growthLabel = growthLabelOf(fois);

  const flags: CalibrationDiagnosticFlag[] = [];

  const weakEvidenceFired = evidenceCount < 3;
  flags.push({
    flag: "Weak Evidence",
    fired: weakEvidenceFired,
    reason: `evidenceCount=${evidenceCount} ${weakEvidenceFired ? "<" : ">="} 3.`,
  });

  const weakBuyingIntentFired = buyingIntent.score < WEAK_BUYING_INTENT_THRESHOLD;
  flags.push({
    flag: "Weak Buying Intent",
    fired: weakBuyingIntentFired,
    reason: `buyingIntent.score=${buyingIntent.score.toFixed(2)} ${weakBuyingIntentFired ? "<" : ">="} ${WEAK_BUYING_INTENT_THRESHOLD}.`,
  });

  const lowDiversityFired = uniqueSources < LOW_DIVERSITY_MIN_SOURCES;
  flags.push({
    flag: "Low Diversity",
    fired: lowDiversityFired,
    reason: `uniqueSources=${uniqueSources} ${lowDiversityFired ? "<" : ">="} ${LOW_DIVERSITY_MIN_SOURCES}.`,
  });

  const echoChamberFired = decision.evidence.echoChamber;
  flags.push({
    flag: "Echo Chamber",
    fired: echoChamberFired,
    reason: decision.evidence.explanation,
  });

  const trendingOnlyFired = growthLabel === "rising" && businessPainRaw < LOW_PAIN_RAW_THRESHOLD;
  flags.push({
    flag: "Trending-only",
    fired: trendingOnlyFired,
    reason: `growth="${growthLabel}" AND businessPain.raw=${businessPainRaw.toFixed(0)} ${
      trendingOnlyFired ? "<" : ">="
    } ${LOW_PAIN_RAW_THRESHOLD} -> ${trendingOnlyFired ? "rising volume without a real pain signal" : "condition not met"}.`,
  });

  const matchedNoSignalPenalty = fois.penalties.find((p) => p.reason.includes(NO_SIGNAL_PENALTY_MARKER));
  const newsSpikeFired = matchedNoSignalPenalty !== undefined;
  flags.push({
    flag: "News Spike",
    fired: newsSpikeFired,
    reason: newsSpikeFired
      ? `FOIS's no-signal penalty fired: ${matchedNoSignalPenalty!.reason}`
      : `No fired FOIS penalty's reason contains "${NO_SIGNAL_PENALTY_MARKER}".`,
  });

  // Approximation, not a direct measurement: this codebase has no field
  // distinguishing "future/hypothetical" evidence from present-tense
  // evidence, so Speculation is approximated as "no buying-intent signal AND
  // no meaningful pain signal" — the same two ingredients as fois.ts's
  // no-signal penalty, evaluated independently here so the flag still fires
  // even when that penalty's own thin-evidence/single-source guard didn't
  // trigger it.
  const speculationFired = buyingIntent.score < WEAK_BUYING_INTENT_THRESHOLD && businessPainRaw < LOW_PAIN_RAW_THRESHOLD;
  flags.push({
    flag: "Speculation",
    fired: speculationFired,
    reason: `Approximated (no direct "future/hypothetical" signal exists in this codebase) via buyingIntent.score=${buyingIntent.score.toFixed(2)} < ${WEAK_BUYING_INTENT_THRESHOLD} AND businessPain.raw=${businessPainRaw.toFixed(0)} < ${LOW_PAIN_RAW_THRESHOLD} -> ${speculationFired}.`,
  });

  const singleMentionFired = evidenceCount <= SINGLE_MENTION_MAX_EVIDENCE;
  flags.push({
    flag: "Single Mention",
    fired: singleMentionFired,
    reason: `evidenceCount=${evidenceCount} ${singleMentionFired ? "<=" : ">"} ${SINGLE_MENTION_MAX_EVIDENCE}.`,
  });

  const sparseClusterFired = uniqueAuthors <= SPARSE_CLUSTER_MAX_AUTHORS;
  flags.push({
    flag: "Sparse Cluster",
    fired: sparseClusterFired,
    reason: `uniqueAuthors=${uniqueAuthors} ${sparseClusterFired ? "<=" : ">"} ${SPARSE_CLUSTER_MAX_AUTHORS}.`,
  });

  const firedDimensionCount = Math.round(metrics.signalDensity * fois.dimensions.length);
  const inflationFired =
    fois.overall >= FOIS_BUILD_THRESHOLD_MIRROR && firedDimensionCount <= ARTIFICIAL_INFLATION_MAX_FIRED_DIMENSIONS;
  flags.push({
    flag: "Artificial Score Inflation",
    fired: inflationFired,
    reason: `fois.overall=${fois.overall} >= ${FOIS_BUILD_THRESHOLD_MIRROR} with only ${firedDimensionCount}/${fois.dimensions.length} independently-fired dimension(s) (raw >= ${SIGNAL_DENSITY_RAW_THRESHOLD}) ${
      inflationFired ? "<=" : ">"
    } ${ARTIFICIAL_INFLATION_MAX_FIRED_DIMENSIONS} -> ${inflationFired ? "score looks driven by one dimension" : "broad-based score"}.`,
  });

  return flags;
}

/* ------------------------------------------------------------------------ */
/* Part E — false-positive detection                                        */
/* ------------------------------------------------------------------------ */

function flagFired(diagnostics: CalibrationDiagnosticFlag[], name: string): boolean {
  return diagnostics.find((d) => d.flag === name)?.fired ?? false;
}

/**
 * Composes Part B's flags into a single likely-false-positive verdict. Per
 * the Loop 4 mission spec, `likely=true` when ANY of:
 *   - News Spike fired, OR
 *   - Single Mention fired AND buyingIntent.score === 0 (a stricter "no
 *     buying intent at all" check than the "Weak Buying Intent" flag's
 *     < 0.2 threshold — deliberately, so this condition only fires on a
 *     complete absence of intent signal, not merely a weak one), OR
 *   - Echo Chamber fired AND Weak Buying Intent fired, OR
 *   - Artificial Score Inflation fired, OR
 *   - Trending-only fired AND Weak Evidence fired.
 * `likely=true` NEVER removes the opportunity from the shipped list — it
 * only marks it for founder review (see module doc).
 */
export function computeFalsePositive(
  report: FounderOpportunityReport,
  diagnostics: CalibrationDiagnosticFlag[],
): CalibrationFalsePositive {
  const reasons: string[] = [];

  if (flagFired(diagnostics, "News Spike")) {
    reasons.push('"News Spike" fired: FOIS applied its no-signal (passive/news-only) penalty.');
  }
  if (flagFired(diagnostics, "Single Mention") && report.buyingIntent.score === 0) {
    reasons.push('"Single Mention" fired AND buyingIntent.score === 0: a single mention with zero purchase-intent signal.');
  }
  if (flagFired(diagnostics, "Echo Chamber") && flagFired(diagnostics, "Weak Buying Intent")) {
    reasons.push('"Echo Chamber" AND "Weak Buying Intent" both fired: single-source-dominated evidence with little willingness to pay.');
  }
  if (flagFired(diagnostics, "Artificial Score Inflation")) {
    reasons.push('"Artificial Score Inflation" fired: fois.overall reached the BUILD band on essentially one dimension.');
  }
  if (flagFired(diagnostics, "Trending-only") && flagFired(diagnostics, "Weak Evidence")) {
    reasons.push('"Trending-only" AND "Weak Evidence" both fired: rising mention volume with no real pain signal and thin evidence.');
  }

  return { likely: reasons.length > 0, reasons };
}

/* ------------------------------------------------------------------------ */
/* Base per-report calibration (metrics + diagnostics + falsePositive)      */
/* ------------------------------------------------------------------------ */

interface BaseCalibration {
  metrics: CalibrationMetrics;
  diagnostics: CalibrationDiagnosticFlag[];
  falsePositive: CalibrationFalsePositive;
}

/**
 * The list-context-free portion of a report's calibration (no ranking or
 * explainability, which need the full shipped-order list — see
 * `attachCalibration`). Used both to build the per-opportunity `calibration`
 * field on the shipped Top-N list, and independently over the full
 * (pre-dedup, pre-slice) `built` candidate list to feed
 * `computeAggregateCalibration`'s run-wide diagnostics.
 */
export function computeBaseCalibration(report: FounderOpportunityReport): BaseCalibration {
  const metrics = computeCalibrationMetrics(report);
  const diagnostics = computeCalibrationDiagnostics(report, metrics);
  const falsePositive = computeFalsePositive(report, diagnostics);
  return { metrics, diagnostics, falsePositive };
}

/** Type-valid placeholder set at FounderOpportunityReport construction time (see engine.ts's `buildOpportunityReport`, mirroring `semanticCluster`'s trivial-default pattern) — ALWAYS overwritten by `attachCalibration` for every surviving report in the shipped Top-N list. Never read by `computeAggregateCalibration`, which recomputes its own base calibration per report instead of trusting this placeholder. */
export function defaultCalibration(): OpportunityCalibration {
  return {
    metrics: {
      rankingStability: 0,
      signalDensity: 0,
      evidenceDensity: 0,
      crossSourceConsistency: 0,
      intentConsistency: 0,
      noiseRatio: 0,
      duplicateCompressionRatio: 0,
    },
    diagnostics: [],
    ranking: {
      rankBefore: 0,
      rankAfter: 0,
      movement: 0,
      reason: "Placeholder set at construction time; overwritten by attachCalibration once the final shipped Top-N order is known (see engine.ts).",
    },
    explainability: null,
    falsePositive: { likely: false, reasons: [] },
  };
}

/* ------------------------------------------------------------------------ */
/* Part C — ranking validation (diagnostic only, list-wide)                 */
/* ------------------------------------------------------------------------ */

/**
 * DIAGNOSTIC ONLY (see CalibrationRanking's doc, types.ts): computes a
 * hypothetical noise-adjusted score per report (`fois.overall * (1 -
 * noiseRatio)`, a documented, fixed choice — noiseRatio already penalizes
 * for fired FOIS penalties, see computeCalibrationMetrics) and reports what
 * each report's rank WOULD be if the shipped list were re-sorted by that
 * score instead. The actual `opportunities` array passed in is returned
 * unmodified by the caller (`attachCalibration`) — this function only
 * computes the hypothetical `rankAfter` per input index.
 */
export function computeRankingForList(
  opportunities: FounderOpportunityReport[],
  bases: BaseCalibration[],
): CalibrationRanking[] {
  const adjustedScores = opportunities.map((report, i) => report.fois.overall * (1 - bases[i]!.metrics.noiseRatio));

  const order = adjustedScores
    .map((score, i) => ({ score, i }))
    .sort((a, b) => b.score - a.score); // stable: ties keep original relative order

  const rankAfterByIndex = new Array<number>(opportunities.length);
  order.forEach((entry, position) => {
    rankAfterByIndex[entry.i] = position + 1;
  });

  return opportunities.map((report, i) => {
    const rankBefore = i + 1;
    const rankAfter = rankAfterByIndex[i]!;
    const movement = rankBefore - rankAfter;
    const noiseRatio = bases[i]!.metrics.noiseRatio;
    const penaltyPoints = report.fois.penalties.reduce((sum, p) => sum + p.points, 0);

    const reason =
      noiseRatio === 0
        ? `No FOIS penalties fired — noise-adjusted score equals fois.overall (${report.fois.overall}); rank unchanged in this hypothetical calibrated view (shipped order is NOT changed).`
        : `noiseRatio=${(noiseRatio * 100).toFixed(0)}% (${penaltyPoints} penalty point(s) relative to fois.overall=${report.fois.overall}) lowers the noise-adjusted score to ${adjustedScores[i]!.toFixed(1)}, moving rank ${rankBefore} -> ${rankAfter} (${movement >= 0 ? "+" : ""}${movement}) in this hypothetical calibrated view (shipped order is NOT changed).`;

    return { rankBefore, rankAfter, movement, reason };
  });
}

/* ------------------------------------------------------------------------ */
/* Part D — explainability (BUILD verdicts only)                            */
/* ------------------------------------------------------------------------ */

const TOP_CONTRIBUTING_SIGNAL_COUNT = 3;

/**
 * Only computed for opportunities whose decision.recommendation.verdict ===
 * "BUILD" (returns null otherwise — see CalibrationExplainability's doc,
 * types.ts, for why). `neighbor` is the next-ranked report in the shipped
 * list (index + 1), needed for `whyAboveNext`; `null` for the last-ranked
 * report.
 */
export function computeExplainability(
  report: FounderOpportunityReport,
  index: number,
  opportunities: FounderOpportunityReport[],
): CalibrationExplainability | null {
  if (report.decision.recommendation.verdict !== "BUILD") return null;

  const rankBefore = index + 1;
  const total = opportunities.length;
  const neighbor = opportunities[index + 1];

  const whyRankedHere = `Ranked #${rankBefore} of ${total} shipped opportunities with fois.overall=${report.fois.overall}/100 (>= BUILD threshold ${FOIS_BUILD_THRESHOLD_MIRROR}).`;

  const whyAboveNext = neighbor
    ? `Outscores the next-ranked opportunity ("${neighbor.problem}", fois.overall=${neighbor.fois.overall}) by ${report.fois.overall - neighbor.fois.overall} point(s).`
    : `Lowest-ranked opportunity in the shipped Top-${total} list — no next-ranked neighbor exists to compare against.`;

  const topContributingSignals = [...report.fois.dimensions]
    .sort((a, b) => b.weighted - a.weighted)
    .slice(0, TOP_CONTRIBUTING_SIGNAL_COUNT)
    .map((dim) => `${dim.name}: ${dim.weighted.toFixed(1)}/100 weighted (raw ${dim.raw}/100 * weight ${dim.weight}).`);

  const decisionEchoPenaltyNotes = report.decision.confidence.weaknesses.filter((w) =>
    w.startsWith("Echo-chamber penalty applied"),
  );
  const penaltiesApplied = [
    ...report.fois.penalties.map((p) => `FOIS penalty (-${p.points}): ${p.reason}`),
    ...decisionEchoPenaltyNotes,
  ];

  const largestUncertainty = report.decision.reasoning.biggestUncertainty;

  return { whyRankedHere, whyAboveNext, topContributingSignals, penaltiesApplied, largestUncertainty };
}

/* ------------------------------------------------------------------------ */
/* Entry point 1 — per-opportunity calibration, wired over the shipped list */
/* ------------------------------------------------------------------------ */

/**
 * Attaches a fully-populated `calibration` field to every report in
 * `opportunities`, PRESERVING the input array's order exactly (only `.map`
 * is used — no sort). Called once, in engine.ts's `analyze`, on the final
 * shipped Top-N list AFTER dedup + semantic merge + the Top-N slice.
 */
export function attachCalibration(opportunities: FounderOpportunityReport[]): FounderOpportunityReport[] {
  const bases = opportunities.map((report) => computeBaseCalibration(report));
  const rankings = computeRankingForList(opportunities, bases);

  return opportunities.map((report, i) => {
    const explainability = computeExplainability(report, i, opportunities);
    const calibration: OpportunityCalibration = {
      metrics: bases[i]!.metrics,
      diagnostics: bases[i]!.diagnostics,
      ranking: rankings[i]!,
      explainability,
      falsePositive: bases[i]!.falsePositive,
    };
    return { ...report, calibration };
  });
}

/* ------------------------------------------------------------------------ */
/* Part F/G — aggregate regression dashboard + threshold diagnostic         */
/* ------------------------------------------------------------------------ */

const FOIS_BUCKET_WIDTH = 20;
const FOIS_BUCKET_RANGES = ["0-19", "20-39", "40-59", "60-79", "80-100"];

function bucketOverallScores(overallScores: number[]): CalibrationFoisBucket[] {
  const counts = new Array(FOIS_BUCKET_RANGES.length).fill(0);
  for (const overall of overallScores) {
    const idx = Math.min(FOIS_BUCKET_RANGES.length - 1, Math.max(0, Math.floor(overall / FOIS_BUCKET_WIDTH)));
    counts[idx] += 1;
  }
  return FOIS_BUCKET_RANGES.map((range, i) => ({ range, count: counts[i] }));
}

/**
 * ADVISORY ONLY — no automatic threshold change is applied anywhere in this
 * codebase from this diagnostic's `suggestion` text (see ThresholdDiagnostic's
 * doc, types.ts).
 */
export function computeThresholdDiagnostic(builtOpportunities: FounderOpportunityReport[]): ThresholdDiagnostic {
  const total = builtOpportunities.length;
  const overallScores = builtOpportunities.map((r) => r.fois.overall);
  const observedFoisDistribution = bucketOverallScores(overallScores);

  const rejectedCount = builtOpportunities.filter((r) => r.fois.overall < FOIS_IGNORE_THRESHOLD_MIRROR).length;
  const acceptedCount = builtOpportunities.filter((r) => r.fois.overall >= FOIS_BUILD_THRESHOLD_MIRROR).length;
  const uncertainCount = total - rejectedCount - acceptedCount;

  const pct = (n: number) => (total === 0 ? 0 : (n / total) * 100);
  const rejectedPct = pct(rejectedCount);
  const acceptedPct = pct(acceptedCount);
  const uncertainPct = pct(uncertainCount);

  const nearMissHighEvidence = builtOpportunities.filter(
    (r) =>
      r.fois.overall < FOIS_BUILD_THRESHOLD_MIRROR &&
      r.fois.overall >= FOIS_BUILD_THRESHOLD_MIRROR - NEAR_MISS_WINDOW_POINTS &&
      r.decision.evidence.evidenceCount >= NEAR_MISS_MIN_EVIDENCE,
  );

  let suggestion: string;
  if (total === 0) {
    suggestion = "No opportunities were built this run — insufficient data to evaluate the BUILD threshold.";
  } else if (acceptedCount === 0 && nearMissHighEvidence.length > 0) {
    suggestion = `Threshold appears too strict — ${nearMissHighEvidence.length} high-evidence opportunit${nearMissHighEvidence.length === 1 ? "y falls" : "ies fall"} (evidenceCount>=${NEAR_MISS_MIN_EVIDENCE}) within ${NEAR_MISS_WINDOW_POINTS} points just below the BUILD threshold (${FOIS_BUILD_THRESHOLD_MIRROR}).`;
  } else if (acceptedPct >= LENIENT_ACCEPT_PCT_THRESHOLD) {
    suggestion = `Threshold appears too lenient — ${acceptedPct.toFixed(0)}% of built opportunities already clear the BUILD bar (>= ${LENIENT_ACCEPT_PCT_THRESHOLD}% threshold); consider raising ${FOIS_BUILD_THRESHOLD_MIRROR}.`;
  } else {
    suggestion = `Threshold appears well-calibrated given the observed distribution (${acceptedPct.toFixed(0)}% accepted, ${uncertainPct.toFixed(0)}% uncertain, ${rejectedPct.toFixed(0)}% rejected).`;
  }

  return {
    foisBuildThreshold: FOIS_BUILD_THRESHOLD_MIRROR,
    observedFoisDistribution,
    rejectedPct,
    acceptedPct,
    uncertainPct,
    suggestion,
  };
}

/**
 * Aggregate regression dashboard for a whole `OpportunityEngine.analyze()`
 * run. Computed over `builtOpportunities` — engine.ts's full, per-cluster
 * `built` list (BEFORE dedup / semantic-merge / Top-N slicing), so this
 * reflects the whole run's health, not just what made the shipped Top-N.
 * Every field is a real read of already-computed data; nothing is
 * fabricated (`itemsRemovedByRelevance` is `null`, not guessed, when the
 * source session predates `relevanceFilter`).
 */
export function computeAggregateCalibration(
  builtOpportunities: FounderOpportunityReport[],
  session: ResearchSession,
  problemReport: ProblemIntelligenceReport,
): CalibrationAggregate {
  const notes: string[] = [];

  const itemsCollected = session.totalItemsCollected;

  let itemsRemovedByRelevance: number | null;
  if (session.relevanceFilter) {
    itemsRemovedByRelevance = session.relevanceFilter.notRelevantCount;
  } else {
    itemsRemovedByRelevance = null;
    notes.push(
      "session.relevanceFilter is undefined on this ResearchSession — itemsRemovedByRelevance is reported as null, not fabricated.",
    );
  }

  const itemsClustered = problemReport.clusters.reduce((sum, cluster) => sum + cluster.evidence.evidenceCount, 0);

  const bases = builtOpportunities.map((report) => computeBaseCalibration(report));

  const opportunitiesRejectedByGates = builtOpportunities.filter((r) =>
    r.decision.qualityGates.some((gate) => gate.fired),
  ).length;

  const averageConfidence = average(builtOpportunities.map((r) => r.confidence.score));
  const averageFois = average(builtOpportunities.map((r) => r.fois.overall));
  const averageEvidence = average(builtOpportunities.map((r) => r.decision.evidence.evidenceCount));
  const averageIntentConcentration = average(bases.map((b) => b.metrics.intentConsistency));
  const averageSourceDiversity = average(builtOpportunities.map((r) => r.decision.evidence.uniqueSources));
  const averageRecommendationConfidence = average(builtOpportunities.map((r) => r.decision.confidence.score));

  const verdictBreakdown = { build: 0, watch: 0, ignore: 0 };
  for (const report of builtOpportunities) {
    if (report.decision.recommendation.verdict === "BUILD") verdictBreakdown.build += 1;
    else if (report.decision.recommendation.verdict === "WATCH") verdictBreakdown.watch += 1;
    else verdictBreakdown.ignore += 1;
  }

  const falsePositiveCount = bases.filter((b) => b.falsePositive.likely).length;

  const thresholdDiagnostic = computeThresholdDiagnostic(builtOpportunities);

  return {
    itemsCollected,
    itemsRemovedByRelevance,
    itemsClustered,
    opportunitiesRejectedByGates,
    averageConfidence,
    averageFois,
    averageEvidence,
    averageIntentConcentration,
    averageSourceDiversity,
    averageRecommendationConfidence,
    verdictBreakdown,
    falsePositiveCount,
    thresholdDiagnostic,
    notes,
  };
}
