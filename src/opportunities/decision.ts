import type { ClassifiedItem, ProblemCategory, ProblemCluster } from "../problems/types.js";
import type {
  BuildDifficultyResult,
  BuyingIntentResult,
  CompetitionResult,
  DecisionConfidence,
  DecisionConfidenceContributor,
  DecisionEvidence,
  DecisionFreshness,
  DecisionQualityGate,
  DecisionReasoning,
  DecisionRecommendation,
  FoisBreakdown,
  FounderDecision,
  FounderDecisionVerdict,
  FounderRecommendation,
  IntentDistributionEntry,
  PricingSignal,
} from "./types.js";

/**
 * Loop 3, Parts B-G — the Founder Decision layer.
 *
 * This module is a COMPOSITION layer, not a new scoring engine: every input
 * it reads (cluster.evidence/frequency, buyingIntent, competition, pricing,
 * buildDifficulty, fois, the existing recommendation) was already computed
 * elsewhere in this codebase (src/problems/**, buying-intent.ts,
 * competition.ts, pricing.ts, difficulty.ts, fois.ts, recommendation.ts —
 * all read-only from here). No LLM call. No re-derivation of clustering,
 * cluster confidence, or FOIS. Every threshold below is a fixed, documented
 * constant (reasoned, not empirically tuned — no labeled founder-outcome
 * dataset was available), and every generated sentence cites a real number
 * from the input, never a fabricated fact or generic platitude.
 */

export interface BuildFounderDecisionInput {
  cluster: ProblemCluster;
  clusterItems: ClassifiedItem[];
  buyingIntent: BuyingIntentResult;
  competition: CompetitionResult;
  pricing: PricingSignal;
  buildDifficulty: BuildDifficultyResult;
  fois: FoisBreakdown;
  /** The report's existing (unmodified) BUILD/WAIT/IGNORE recommendation — reused as source material, e.g. for `reasoning.biggestImplementationRisk`. */
  recommendation: FounderRecommendation;
  /** Already-computed, evidence-derived audience description (mvp-template.ts's `getTargetUsers`) — reused verbatim in `reasoning.whoExperiences` rather than recomputed. */
  targetUsers: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/* ======================================================================= */
/* Part B — Intent distribution                                            */
/* ======================================================================= */

/**
 * Maps every `src/problems/detector.ts` `ProblemCategory` to a founder-
 * facing intent name. Per the Loop 3 mapping spec:
 *   Founder Pain            = complaint + bug + workflow-friction
 *   Feature Request         = feature-request + missing-capability
 *   Buying Intent           = buying-intent
 *   Migration               = migration + looking-for-alternative
 *   Pricing Complaint       = pricing-complaint
 *   Automation Need         = workaround
 *   Positive Validation     = praise
 *   Unknown                 = other
 *
 * Two categories the Loop 3 spec's table didn't explicitly enumerate get
 * their own founder-facing bucket below, so every possible
 * `CategoryMatch.category` value maps to SOMETHING (an item's signal is
 * never silently dropped from the distribution):
 *   Market Gap               = market-gap (no existing solution reported)
 *   Existing Spending        = existing-spending (confirmed budget signal)
 *
 * `"trend"` is included only for TypeScript exhaustiveness over the
 * `ProblemCategory` union — `classifyItem` (detector.ts) never assigns it
 * to a `ClassifiedItem`; `trend` only ever appears as `ProblemCluster
 * .trending` (a boolean flag on an existing cluster, per Loop 4 Phase 3),
 * so this branch has no live producer today.
 */
const DETECTOR_TO_INTENT: Record<ProblemCategory, string> = {
  complaint: "Founder Pain",
  bug: "Founder Pain",
  "workflow-friction": "Founder Pain",
  "feature-request": "Feature Request",
  "missing-capability": "Feature Request",
  "buying-intent": "Buying Intent",
  migration: "Migration",
  "looking-for-alternative": "Migration",
  "pricing-complaint": "Pricing Complaint",
  workaround: "Automation Need / Manual Process",
  praise: "Positive Validation",
  other: "Unknown",
  "market-gap": "Market Gap (No Existing Solution)",
  "existing-spending": "Existing Spending (Budget Confirmed)",
  trend: "Unknown",
};

/**
 * Counts each founder-facing intent across `clusterItems`. An item matching
 * multiple detector categories that map to the SAME founder-facing intent
 * (e.g. both "complaint" and "bug" -> "Founder Pain") is counted once for
 * that intent, not once per matched category — `count` is "how many items
 * carry this intent", not "how many raw category matches occurred". An item
 * matching categories that map to DIFFERENT intents (e.g. "buying-intent"
 * AND "praise") is counted once under EACH of those intents, so fractions
 * across entries do not necessarily sum to 1.0 — documented on the type.
 */
export function computeIntentDistribution(clusterItems: ClassifiedItem[]): IntentDistributionEntry[] {
  const counts = new Map<string, number>();

  for (const classified of clusterItems) {
    const distinctIntents = new Set(classified.categories.map((match) => DETECTOR_TO_INTENT[match.category]));
    for (const intent of distinctIntents) {
      counts.set(intent, (counts.get(intent) ?? 0) + 1);
    }
  }

  const total = clusterItems.length;
  return [...counts.entries()]
    .map(([intent, count]) => ({ intent, count, fraction: total === 0 ? 0 : count / total }))
    .sort((a, b) => b.count - a.count || a.intent.localeCompare(b.intent));
}

/* ======================================================================= */
/* Part C — Evidence intelligence + echo-chamber                           */
/* ======================================================================= */

/** A single source is treated as dominating the evidence (echo-chamber risk) at or above this share of all items. */
const ECHO_CHAMBER_SOURCE_SHARE_THRESHOLD = 0.9;

/** Evidence whose latest item is this many days old or newer is "fresh". */
const FRESHNESS_FRESH_MAX_DAYS = 7;
/** Evidence whose latest item is older than FRESHNESS_FRESH_MAX_DAYS but within this many days is "aging"; older still is "stale". */
const FRESHNESS_AGING_MAX_DAYS = 30;

function computeEchoChamber(
  sourceBreakdown: Record<string, number>,
  evidenceCount: number,
): { echoChamber: boolean; dominantSource: string | null; dominantShare: number } {
  if (evidenceCount === 0) {
    return { echoChamber: false, dominantSource: null, dominantShare: 0 };
  }

  let dominantSource: string | null = null;
  let dominantCount = -1;
  for (const [sourceId, count] of Object.entries(sourceBreakdown)) {
    if (count > dominantCount) {
      dominantSource = sourceId;
      dominantCount = count;
    }
  }

  const dominantShare = dominantCount < 0 ? 0 : dominantCount / evidenceCount;
  return {
    echoChamber: dominantShare >= ECHO_CHAMBER_SOURCE_SHARE_THRESHOLD,
    dominantSource,
    dominantShare,
  };
}

function computeFreshness(dateRange: ProblemCluster["evidence"]["dateRange"]): {
  label: DecisionFreshness;
  explanation: string;
} {
  if (!dateRange) {
    return {
      label: "unknown",
      explanation: "No published-date metadata on any evidence item — freshness cannot be determined (never guessed).",
    };
  }

  const latestMs = Date.parse(dateRange.latest);
  if (Number.isNaN(latestMs)) {
    return {
      label: "unknown",
      explanation: `dateRange.latest ("${dateRange.latest}") could not be parsed — freshness cannot be determined.`,
    };
  }

  const ageDays = Math.max(0, (Date.now() - latestMs) / DAY_MS);
  if (ageDays <= FRESHNESS_FRESH_MAX_DAYS) {
    return { label: "fresh", explanation: `Latest evidence is ${ageDays.toFixed(1)} day(s) old (<= ${FRESHNESS_FRESH_MAX_DAYS}d threshold).` };
  }
  if (ageDays <= FRESHNESS_AGING_MAX_DAYS) {
    return { label: "aging", explanation: `Latest evidence is ${ageDays.toFixed(1)} day(s) old (<= ${FRESHNESS_AGING_MAX_DAYS}d threshold).` };
  }
  return { label: "stale", explanation: `Latest evidence is ${ageDays.toFixed(1)} day(s) old (> ${FRESHNESS_AGING_MAX_DAYS}d threshold).` };
}

/** Count of distinct sources that EACH independently contain at least one item carrying `dominantIntent`. */
function computeCrossSourceAgreement(clusterItems: ClassifiedItem[], dominantIntent: string): number {
  const sources = new Set<string>();
  for (const classified of clusterItems) {
    const intents = new Set(classified.categories.map((match) => DETECTOR_TO_INTENT[match.category]));
    if (intents.has(dominantIntent)) {
      sources.add(classified.item.sourceId);
    }
  }
  return sources.size;
}

function buildDecisionEvidence(
  cluster: ProblemCluster,
  clusterItems: ClassifiedItem[],
  dominantIntent: string,
): DecisionEvidence {
  const { echoChamber, dominantSource, dominantShare } = computeEchoChamber(
    cluster.evidence.sourceBreakdown,
    cluster.evidence.evidenceCount,
  );
  const freshness = computeFreshness(cluster.evidence.dateRange);
  const crossSourceAgreement = computeCrossSourceAgreement(clusterItems, dominantIntent);

  const echoChamberNote = echoChamber
    ? `Echo-chamber risk: source "${dominantSource}" accounts for ${(dominantShare * 100).toFixed(0)}% of evidence (>= ${(ECHO_CHAMBER_SOURCE_SHARE_THRESHOLD * 100).toFixed(0)}% threshold).`
    : `No echo-chamber risk detected (top source share ${(dominantShare * 100).toFixed(0)}% < ${(ECHO_CHAMBER_SOURCE_SHARE_THRESHOLD * 100).toFixed(0)}% threshold).`;

  return {
    evidenceCount: cluster.evidence.evidenceCount,
    uniqueSources: cluster.frequency.uniqueSources,
    uniqueAuthors: cluster.frequency.uniqueAuthors,
    freshness: freshness.label,
    crossSourceAgreement,
    echoChamber,
    explanation: `${freshness.explanation} ${echoChamberNote}`,
  };
}

/* ======================================================================= */
/* Part E — Explainable decision confidence                                */
/* ======================================================================= */

/**
 * Points budgets per named contributor — sum to exactly 100 (asserted
 * below at import time, mirroring fois.ts's WEIGHT_SUM guard). Each budget
 * is a reasoned default, not empirically tuned.
 */
const EVIDENCE_STRENGTH_MAX_POINTS = 25;
const EVIDENCE_STRENGTH_POINTS_PER_ITEM = 3;

const SOURCE_DIVERSITY_MAX_POINTS = 20;
const SOURCE_DIVERSITY_POINTS_PER_SOURCE = 7;

const FRESHNESS_MAX_POINTS = 10;
const FRESHNESS_POINTS_BY_LABEL: Record<DecisionFreshness, number> = {
  fresh: FRESHNESS_MAX_POINTS,
  aging: Math.round(FRESHNESS_MAX_POINTS / 2),
  stale: 2,
  // Never fabricated: no date data means no points either way, not a
  // guessed middle value.
  unknown: 0,
};

const INTENT_AGREEMENT_MAX_POINTS = 15;

const FOIS_STABILITY_MAX_POINTS = 30;
/** Points deducted from the fois-stability contributor when at least one FOIS penalty (fois.ts) fired for this cluster. */
const FOIS_STABILITY_PENALTY_DEDUCTION = 5;
/**
 * fois.overall is the dominant input to this contributor; the source
 * ProblemCluster's OWN confidence.score (src/problems/confidence.ts,
 * read-only) is blended in as a smaller, corroborating input — this is
 * the concrete mechanism by which this NEW decision-level confidence
 * "reads the cluster confidence as one input" without modifying or
 * duplicating src/problems/confidence.ts itself. Weights sum to 1.0.
 */
const FOIS_STABILITY_FOIS_WEIGHT = 0.7;
const FOIS_STABILITY_CLUSTER_CONFIDENCE_WEIGHT = 0.3;

/**
 * Known architectural gap (per the Loop 3 spec): whether the Opportunity
 * this evidence traces back to was upstream-classified "relevant" vs
 * "uncertain" by src/research/relevance.ts is not threaded through
 * src/problems' ClassifiedItem/ProblemCluster types, so it cannot be
 * computed here. Rather than inventing a value, this contributor always
 * awards 0 of a 0-point budget — present in `contributors` for
 * transparency, but neither rewarding nor penalizing the score.
 */
const RELEVANCE_QUALITY_MAX_POINTS = 0;

const CONTRIBUTOR_MAX_POINTS: Record<string, number> = {
  evidenceStrength: EVIDENCE_STRENGTH_MAX_POINTS,
  sourceDiversity: SOURCE_DIVERSITY_MAX_POINTS,
  freshness: FRESHNESS_MAX_POINTS,
  intentAgreement: INTENT_AGREEMENT_MAX_POINTS,
  foisStability: FOIS_STABILITY_MAX_POINTS,
  relevanceQuality: RELEVANCE_QUALITY_MAX_POINTS,
};

const CONTRIBUTOR_MAX_POINTS_SUM = Object.values(CONTRIBUTOR_MAX_POINTS).reduce((sum, v) => sum + v, 0);
if (CONTRIBUTOR_MAX_POINTS_SUM !== 100) {
  // Fail loudly at import time rather than silently producing a
  // mis-scaled score — mirrors fois.ts's WEIGHT_SUM guard.
  throw new Error(`Decision confidence contributor max points must sum to 100, got ${CONTRIBUTOR_MAX_POINTS_SUM}`);
}

/** Below this fraction of a contributor's own max points, it is surfaced in `weaknesses`. */
const WEAKNESS_CONTRIBUTOR_SHARE_THRESHOLD = 0.5;

/** Subtracted from the summed contributor points when `evidence.echoChamber` is true — applied here, not to fois.ts or cluster.confidence (see Part C/E spec). */
const ECHO_CHAMBER_CONFIDENCE_PENALTY_POINTS = 20;

const DECISION_CONFIDENCE_HIGH_THRESHOLD = 70;
const DECISION_CONFIDENCE_MEDIUM_THRESHOLD = 40;

function computeDecisionConfidence(params: {
  cluster: ProblemCluster;
  fois: FoisBreakdown;
  evidence: DecisionEvidence;
  topIntent: IntentDistributionEntry;
}): DecisionConfidence {
  const { cluster, fois, evidence, topIntent } = params;
  const contributors: DecisionConfidenceContributor[] = [];

  const evidenceStrengthPoints = Math.min(
    EVIDENCE_STRENGTH_MAX_POINTS,
    evidence.evidenceCount * EVIDENCE_STRENGTH_POINTS_PER_ITEM,
  );
  contributors.push({
    name: "evidenceStrength",
    points: evidenceStrengthPoints,
    reason: `${evidence.evidenceCount} evidence item(s) -> min(${EVIDENCE_STRENGTH_MAX_POINTS}, evidenceCount*${EVIDENCE_STRENGTH_POINTS_PER_ITEM}) = ${evidenceStrengthPoints}/${EVIDENCE_STRENGTH_MAX_POINTS} points.`,
  });

  const sourceDiversityPoints = Math.min(
    SOURCE_DIVERSITY_MAX_POINTS,
    evidence.uniqueSources * SOURCE_DIVERSITY_POINTS_PER_SOURCE,
  );
  contributors.push({
    name: "sourceDiversity",
    points: sourceDiversityPoints,
    reason: `${evidence.uniqueSources} unique source(s) -> min(${SOURCE_DIVERSITY_MAX_POINTS}, uniqueSources*${SOURCE_DIVERSITY_POINTS_PER_SOURCE}) = ${sourceDiversityPoints}/${SOURCE_DIVERSITY_MAX_POINTS} points.`,
  });

  const freshnessPoints = FRESHNESS_POINTS_BY_LABEL[evidence.freshness];
  contributors.push({
    name: "freshness",
    points: freshnessPoints,
    reason: `Evidence freshness is "${evidence.freshness}" -> ${freshnessPoints}/${FRESHNESS_MAX_POINTS} points.`,
  });

  const intentAgreementPoints = Math.round(topIntent.fraction * INTENT_AGREEMENT_MAX_POINTS);
  contributors.push({
    name: "intentAgreement",
    points: intentAgreementPoints,
    reason: `Dominant intent "${topIntent.intent}" concentration is ${(topIntent.fraction * 100).toFixed(0)}% of items (${topIntent.count} item(s)) -> round(${(topIntent.fraction * 100).toFixed(0)}% * ${INTENT_AGREEMENT_MAX_POINTS}) = ${intentAgreementPoints}/${INTENT_AGREEMENT_MAX_POINTS} points (higher concentration = a clearer, less-mixed signal).`,
  });

  const foisPenaltyFired = fois.penalties.length > 0;
  const blendedRatio =
    (fois.overall / 100) * FOIS_STABILITY_FOIS_WEIGHT + cluster.confidence.score * FOIS_STABILITY_CLUSTER_CONFIDENCE_WEIGHT;
  const foisStabilityBase = Math.round(blendedRatio * FOIS_STABILITY_MAX_POINTS);
  const foisStabilityPoints = Math.max(0, foisPenaltyFired ? foisStabilityBase - FOIS_STABILITY_PENALTY_DEDUCTION : foisStabilityBase);
  contributors.push({
    name: "foisStability",
    points: foisStabilityPoints,
    reason: `fois.overall=${fois.overall}/100 (weight ${FOIS_STABILITY_FOIS_WEIGHT}) blended with source cluster.confidence.score=${cluster.confidence.score.toFixed(2)} (weight ${FOIS_STABILITY_CLUSTER_CONFIDENCE_WEIGHT}) -> ${foisStabilityBase}/${FOIS_STABILITY_MAX_POINTS}${foisPenaltyFired ? `, minus ${FOIS_STABILITY_PENALTY_DEDUCTION} for ${fois.penalties.length} fired FOIS penalt${fois.penalties.length === 1 ? "y" : "ies"}` : ""} = ${foisStabilityPoints}/${FOIS_STABILITY_MAX_POINTS} points.`,
  });

  contributors.push({
    name: "relevanceQuality",
    points: RELEVANCE_QUALITY_MAX_POINTS,
    reason:
      `Known gap: whether this evidence's source Opportunity was upstream-classified "relevant" vs "uncertain" ` +
      `(src/research/relevance.ts's RelevanceDecision) is not threaded into src/problems' ClassifiedItem/ProblemCluster ` +
      `types, so it cannot be computed here -> ${RELEVANCE_QUALITY_MAX_POINTS}/${RELEVANCE_QUALITY_MAX_POINTS} points ` +
      `(neither rewarded nor penalized; not invented).`,
  });

  const rawTotal = contributors.reduce((sum, c) => sum + c.points, 0);
  const echoChamberPenaltyApplied = evidence.echoChamber ? ECHO_CHAMBER_CONFIDENCE_PENALTY_POINTS : 0;
  const score = Math.max(0, Math.min(100, rawTotal - echoChamberPenaltyApplied));

  const band: DecisionConfidence["band"] =
    score >= DECISION_CONFIDENCE_HIGH_THRESHOLD ? "high" : score >= DECISION_CONFIDENCE_MEDIUM_THRESHOLD ? "medium" : "low";

  const weaknesses: string[] = [];
  for (const contributor of contributors) {
    if (contributor.name === "relevanceQuality") {
      weaknesses.push(`Known gap (relevanceQuality): ${contributor.reason}`);
      continue;
    }
    const max = CONTRIBUTOR_MAX_POINTS[contributor.name] ?? 0;
    if (max > 0 && contributor.points / max < WEAKNESS_CONTRIBUTOR_SHARE_THRESHOLD) {
      weaknesses.push(`Low "${contributor.name}" contribution (${contributor.points}/${max} points): ${contributor.reason}`);
    }
  }
  if (echoChamberPenaltyApplied > 0) {
    weaknesses.push(`Echo-chamber penalty applied: -${echoChamberPenaltyApplied} points. ${evidence.explanation}`);
  }

  return { score, band, contributors, weaknesses };
}

/* ======================================================================= */
/* Part G — Quality gates                                                  */
/* ======================================================================= */

/** Gate 1: below this many evidence items, no other dimension's score should be allowed to justify a BUILD/WATCH verdict. */
const GATE_MIN_EVIDENCE_COUNT = 2;
/** Gate 4: substring shared with fois.ts's NO_SIGNAL_PENALTY_POINTS reason text (see fois.ts computePenalties) — reused, not redefined, so the two stay in sync by construction. */
const NO_SIGNAL_PENALTY_REASON_MARKER = "passive/news-only";

function evaluateQualityGates(params: {
  evidenceCount: number;
  confidenceBand: DecisionConfidence["band"];
  echoChamber: boolean;
  buyingIntentScore: number;
  fois: FoisBreakdown;
}): DecisionQualityGate[] {
  const { evidenceCount, confidenceBand, echoChamber, buyingIntentScore, fois } = params;
  const gates: DecisionQualityGate[] = [];

  const evidenceTooWeak = evidenceCount < GATE_MIN_EVIDENCE_COUNT;
  gates.push({
    name: "evidenceTooWeak",
    fired: evidenceTooWeak,
    reason: `evidenceCount=${evidenceCount} ${evidenceTooWeak ? "<" : ">="} ${GATE_MIN_EVIDENCE_COUNT} (minimum evidence required before any conclusion can be trusted).`,
  });

  const confidenceTooLow = confidenceBand === "low";
  gates.push({
    name: "confidenceTooLow",
    fired: confidenceTooLow,
    reason: `decision.confidence.band="${confidenceBand}" ${confidenceTooLow ? "==" : "!="} "low".`,
  });

  const echoChamberNoBuyingIntent = echoChamber && buyingIntentScore === 0;
  gates.push({
    name: "echoChamberNoBuyingIntent",
    fired: echoChamberNoBuyingIntent,
    reason: `echoChamber=${echoChamber} AND buyingIntent.score=${buyingIntentScore.toFixed(2)} -> ${echoChamberNoBuyingIntent ? "single-source echo chamber with zero buying-intent signal" : "condition not met"}.`,
  });

  const foisNoSignalPenalty = fois.penalties.some((penalty) => penalty.reason.includes(NO_SIGNAL_PENALTY_REASON_MARKER));
  gates.push({
    name: "foisNoSignalPenalty",
    fired: foisNoSignalPenalty,
    reason: foisNoSignalPenalty
      ? `FOIS applied its no-signal penalty (a fired penalty's reason contains "${NO_SIGNAL_PENALTY_REASON_MARKER}") — evidence looks like passive/news-only chatter, not a founder opportunity.`
      : `No fired FOIS penalty's reason contains "${NO_SIGNAL_PENALTY_REASON_MARKER}".`,
  });

  return gates;
}

/* ======================================================================= */
/* Part F — Recommendation                                                 */
/* ======================================================================= */

/** BUILD requires fois.overall at or above this (AND decision.confidence.band != "low", AND no quality gate fired). */
const FOIS_BUILD_THRESHOLD = 60;
/** Below this fois.overall, verdict is IGNORE even if no named quality gate fired — the score itself is too low. */
const FOIS_IGNORE_THRESHOLD = 35;

function decideFounderRecommendation(params: {
  fois: FoisBreakdown;
  confidence: DecisionConfidence;
  qualityGates: DecisionQualityGate[];
}): DecisionRecommendation {
  const { fois, confidence, qualityGates } = params;
  const firedGates = qualityGates.filter((gate) => gate.fired);

  let verdict: FounderDecisionVerdict;
  let justification: string;

  if (firedGates.length > 0) {
    verdict = "IGNORE";
    justification = `Quality gate(s) fired: ${firedGates.map((gate) => `${gate.name} (${gate.reason})`).join("; ")} -> forced IGNORE regardless of score (see Part G gates).`;
  } else if (fois.overall >= FOIS_BUILD_THRESHOLD && confidence.band !== "low") {
    verdict = "BUILD";
    justification = `fois.overall=${fois.overall} >= ${FOIS_BUILD_THRESHOLD} AND decision.confidence.band="${confidence.band}" != "low", and no quality gates fired -> BUILD.`;
  } else if (fois.overall < FOIS_IGNORE_THRESHOLD) {
    verdict = "IGNORE";
    justification = `fois.overall=${fois.overall} < ${FOIS_IGNORE_THRESHOLD} -> IGNORE (score too low to justify building, independent of any named quality gate).`;
  } else {
    verdict = "WATCH";
    justification = `fois.overall=${fois.overall} (needs >= ${FOIS_BUILD_THRESHOLD} for BUILD; would need < ${FOIS_IGNORE_THRESHOLD} for a score-based IGNORE) with decision.confidence.band="${confidence.band}" (${confidence.score}/100) and no quality gates fired -> WATCH: promising but not yet conclusive.`;
  }

  const primaryRisk = fois.weaknesses.length > 0 ? fois.weaknesses[0]! : "No major FOIS weakness or penalty was identified.";
  const primaryOpportunity = fois.reasons.length > 0 ? fois.reasons[0]! : "No standout FOIS dimension was identified.";

  return { verdict, justification, primaryRisk, primaryOpportunity };
}

/* ======================================================================= */
/* Part D — Structured reasoning                                           */
/* ======================================================================= */

function buildReasoning(params: {
  cluster: ProblemCluster;
  clusterItems: ClassifiedItem[];
  topIntent: IntentDistributionEntry;
  buyingIntent: BuyingIntentResult;
  pricing: PricingSignal;
  competition: CompetitionResult;
  buildDifficulty: BuildDifficultyResult;
  evidence: DecisionEvidence;
  confidence: DecisionConfidence;
  targetUsers: string;
  recommendation: FounderRecommendation;
}): DecisionReasoning {
  const { cluster, clusterItems, topIntent, buyingIntent, pricing, competition, buildDifficulty, evidence, confidence, targetUsers, recommendation } =
    params;
  const totalItems = clusterItems.length;

  const whyThisMatters =
    `${cluster.evidence.evidenceCount} piece(s) of evidence were found for "${cluster.normalizedStatement}" ` +
    `(category: ${cluster.category}); the dominant classified intent is "${topIntent.intent}" at ` +
    `${(topIntent.fraction * 100).toFixed(0)}% of items (${topIntent.count}/${totalItems || cluster.evidence.evidenceCount}).`;

  const urgentCount = clusterItems.filter((classified) => classified.urgency === true).length;
  const whyNow =
    cluster.frequency.growth.label === "rising"
      ? `Mention volume is rising: ${cluster.frequency.growth.recentHalfCount} recent-half mention(s) vs ${cluster.frequency.growth.earlierHalfCount} earlier-half (ratio ${cluster.frequency.growth.ratio?.toFixed(2) ?? "n/a"}).`
      : urgentCount > 0
        ? `${urgentCount}/${totalItems} item(s) carry an explicit urgency phrase, even though overall mention growth is "${cluster.frequency.growth.label}".`
        : `No rising-volume or explicit urgency phrase was found (growth="${cluster.frequency.growth.label}") — timing urgency is not evidenced here, not assumed.`;

  const whoExperiences = `Evidence spans ${cluster.frequency.uniqueSources} unique source(s) and ${cluster.frequency.uniqueAuthors} unique author(s). ${targetUsers}`;

  const sourceList =
    Object.entries(cluster.evidence.sourceBreakdown)
      .map(([source, count]) => `${source}=${count}`)
      .join(", ") || "none";
  const whatEvidence = `${cluster.evidence.evidenceCount} item(s) across sources: ${sourceList}. ${
    evidence.echoChamber
      ? "This is a single-source echo chamber (see decision.evidence.echoChamber)."
      : `Cross-source agreement: ${evidence.crossSourceAgreement} distinct source(s) independently surfaced the dominant "${topIntent.intent}" intent.`
  }`;

  const priceText =
    pricing.extractedPrices.length > 0
      ? `${pricing.extractedPrices.length} concrete price point(s) were mentioned in evidence (lowest $${pricing.extractedPrices[0]}).`
      : "No concrete price point was mentioned in evidence.";
  const whyFoundersPay = `Buying-intent score is ${buyingIntent.score.toFixed(2)} (${buyingIntent.matchingItemCount}/${buyingIntent.totalItemCount} items show explicit or implicit purchase signal). ${priceText}`;

  const weakestDimension = [...params.confidence.contributors]
    .filter((c) => c.name !== "relevanceQuality")
    .sort((a, b) => a.points - b.points)[0];
  const biggestUncertainty = weakestDimension
    ? `The weakest decision-confidence contributor is "${weakestDimension.name}" (${weakestDimension.points} points: ${weakestDimension.reason}). Overall decision confidence is "${confidence.band}" (${confidence.score}/100).`
    : `Decision confidence is "${confidence.band}" (${confidence.score}/100); no contributor breakdown was available to identify a specific weak point.`;

  const competitorNote =
    competition.competitors.length > 0
      ? `${competition.competitors.length} named competitor(s) already found in evidence (top: ${competition.competitors[0]!.name}, ${competition.competitors[0]!.mentionCount} mention(s)).`
      : "No named competitor found in evidence (not proof of zero competition, only that none was mentioned).";
  const nonGenericRisk = recommendation.risk.find((risk) => !risk.startsWith("No major heuristic risk signals detected"));
  const biggestImplementationRisk = `Build difficulty is "${buildDifficulty.tier}" (${buildDifficulty.matchedSignals.length} difficulty signal(s) matched${
    buildDifficulty.matchedSignals.length > 0 ? ": " + buildDifficulty.matchedSignals.join(", ") : ""
  }). ${competitorNote}${nonGenericRisk ? ` ${nonGenericRisk}` : ""}`;

  return { whyThisMatters, whyNow, whoExperiences, whatEvidence, whyFoundersPay, biggestUncertainty, biggestImplementationRisk };
}

/* ======================================================================= */
/* Entry point                                                             */
/* ======================================================================= */

const UNKNOWN_INTENT_FALLBACK: IntentDistributionEntry = { intent: "Unknown", count: 0, fraction: 0 };

/**
 * Composes every Founder Decision part (B-G) from already-computed inputs.
 * Pure function — no side effects, no LLM call, no re-derivation of
 * clustering/confidence/FOIS. Called once per opportunity from
 * engine.ts's `buildOpportunityReport`.
 */
export function buildFounderDecision(input: BuildFounderDecisionInput): FounderDecision {
  const { cluster, clusterItems, buyingIntent, competition, pricing, buildDifficulty, fois, recommendation, targetUsers } = input;

  const intentDistribution = computeIntentDistribution(clusterItems);
  const topIntent = intentDistribution[0] ?? UNKNOWN_INTENT_FALLBACK;

  const evidence = buildDecisionEvidence(cluster, clusterItems, topIntent.intent);
  const confidence = computeDecisionConfidence({ cluster, fois, evidence, topIntent });
  const qualityGates = evaluateQualityGates({
    evidenceCount: cluster.evidence.evidenceCount,
    confidenceBand: confidence.band,
    echoChamber: evidence.echoChamber,
    buyingIntentScore: buyingIntent.score,
    fois,
  });
  const decisionRecommendation = decideFounderRecommendation({ fois, confidence, qualityGates });
  const reasoning = buildReasoning({
    cluster,
    clusterItems,
    topIntent,
    buyingIntent,
    pricing,
    competition,
    buildDifficulty,
    evidence,
    confidence,
    targetUsers,
    recommendation,
  });

  return {
    intentDistribution,
    evidence,
    reasoning,
    confidence,
    recommendation: decisionRecommendation,
    qualityGates,
  };
}
