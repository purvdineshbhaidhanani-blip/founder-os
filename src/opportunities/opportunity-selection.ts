import type { ProblemCluster } from "../problems/types.js";
import type { GrowthStageLabel } from "./market-intelligence.js";
import type {
  BusinessViabilityResult,
  DifferentiationEngineResult,
  EliminationVerdict,
  FounderOpportunityReport,
  FrictionTier,
  HighConvictionScore,
  HighConvictionScoreDimension,
  MarketGapName,
  MarketReplacementAnalysis,
  OpportunitySelectionRejected,
  OpportunitySelectionResult,
  OpportunitySelectionSurvivor,
  QualificationGate,
  QualificationGateStatus,
  SelfCritique,
} from "./types.js";

/**
 * Opportunity Selection / Elimination layer.
 *
 * Founder OS's real job isn't finding opportunities, it's eliminating weak
 * ones until only the highest-conviction survive. This module is a PURELY
 * ADDITIVE selection/elimination layer that composes exclusively from fields
 * already computed on a `FounderOpportunityReport` (fois, decision,
 * founderIntelligence, businessIntelligence, marketIntelligence,
 * revenueIntelligence, aiDecisionValidation, calibration, semanticCluster,
 * competition, buyingIntent) plus its matching source `ProblemCluster`
 * (looked up by `clusterId`, exactly like `attachFounderIntelligence`/
 * `attachAiDecisionValidation` already do — see engine.ts). No LLM call, no
 * network, no filesystem writes, zero new raw-evidence scans, and zero
 * recomputation of fois/decision/calibration/founderIntelligence/
 * aiDecisionValidation/anything upstream. Every threshold below is a fixed,
 * documented, reasoned constant (no labeled founder-outcome dataset exists to
 * empirically tune against, matching every other threshold in this
 * codebase). Every rejection/gate/score cites a real, already-computed value
 * — never a fabricated fact or generic platitude; UNKNOWN is always used
 * instead of a guess when the backing signal genuinely doesn't exist.
 *
 * Wired into engine.ts as the LAST step of `analyze()`, over the already-
 * built, already-ranked, already-sliced Top-N `opportunities` array (read-
 * only: never re-sorts, re-scores, or mutates that array or any report on
 * it) — see `TopOpportunitiesReport.opportunitySelection`'s doc, types.ts.
 *
 * NOTE on `selectTopOpportunities`'s signature: this module's entry point
 * takes the source `clusters: ProblemCluster[]` as a second argument (not
 * just `reports`), because several qualification gates / elimination rules
 * need real fields that live on `ProblemCluster` (frequency.growth,
 * severity, rootCause, symptoms) but are NOT copied onto
 * `FounderOpportunityReport` itself. This mirrors the exact established
 * pattern of `attachFounderIntelligence(opportunities, clusters)` /
 * `attachAiDecisionValidation(opportunities, clusters)` in this same
 * directory — a deliberate, documented choice, not a deviation from any
 * upstream architecture spec (this module owns its own new, additive
 * signature).
 */

/* ========================================================================= */
/* Shared constants                                                          */
/* ========================================================================= */

/** The literal sentinel string this codebase uses everywhere a dollar/revenue figure has no real evidence backing it (see business-intelligence.ts / revenue-intelligence.ts / ai-decision-validation.ts). */
const NOT_VERIFIED_SENTINEL = "NOT VERIFIED";

/** Mirrors calibration.ts's own `LOW_DIVERSITY_MIN_SOURCES` — the minimum unique-source count treated as "sufficient" multi-source corroboration. calibration.ts is a READ-ONLY input here, so this is a deliberate, documented duplicate (same reasoning as calibration.ts's own mirrors of decision.ts's thresholds). */
const MIN_MULTI_SOURCE_COUNT = 2;

/** Mirrors fois.ts's own competitionPressure dimension's "3-5 named competitors" crowded-market band boundary — the count at/above which a market is treated as having enough named incumbents to matter for elimination/friction purposes. */
const COMPETITOR_COUNT_HIGH_THRESHOLD = 3;

/** Hard cap on survivors — Founder OS surfaces at most this many highest-conviction opportunities, per the mission's "eliminate until only the highest-conviction survive" mandate. */
const MAX_SURVIVORS = 5;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/* ========================================================================= */
/* Part A — Qualification Gates (10, always evaluated)                       */
/* ========================================================================= */

function gate(name: string, status: QualificationGateStatus, evidence: string[], reason: string): QualificationGate {
  return { gate: name, status, evidence, reason };
}

/**
 * Fixed, named set of 10 qualification gates, ALWAYS all 10 present (fired
 * or not — mirrors decision.ts's `qualityGates` / calibration.ts's
 * `diagnostics` always-present transparency philosophy). Every gate is
 * derived from a real, already-computed field on `report`/`cluster`; UNKNOWN
 * is returned instead of a guess whenever the backing signal doesn't exist.
 */
export function computeQualificationGates(
  report: FounderOpportunityReport,
  cluster: ProblemCluster | undefined,
): QualificationGate[] {
  const gates: QualificationGate[] = [];

  /* 1. Recurring problem — cluster.frequency.growth.label */
  const growthLabel = cluster?.frequency.growth.label;
  if (!cluster || growthLabel === undefined) {
    gates.push(
      gate(
        "Recurring problem",
        "UNKNOWN",
        ["source cluster unavailable"],
        "No source ProblemCluster was available to read frequency.growth.label from.",
      ),
    );
  } else if (growthLabel === "rising" || growthLabel === "stable") {
    gates.push(
      gate(
        "Recurring problem",
        "PASS",
        [`cluster.frequency.growth.label="${growthLabel}"`],
        `growth.label="${growthLabel}" -- the problem keeps recurring, not a one-off.`,
      ),
    );
  } else if (growthLabel === "declining") {
    gates.push(
      gate(
        "Recurring problem",
        "FAIL",
        [`cluster.frequency.growth.label="declining"`],
        `growth.label="declining" -- mention volume is fading, not recurring.`,
      ),
    );
  } else {
    gates.push(
      gate(
        "Recurring problem",
        "UNKNOWN",
        [`cluster.frequency.growth.label="insufficient-data"`],
        `growth.label="insufficient-data" -- not enough history to call this recurring or not; never guessed.`,
      ),
    );
  }

  /* 2. Expensive problem — cluster.severity.moneyCost, fallback businessIntelligence.budgetEstimate */
  if (cluster?.severity) {
    const moneyCost = cluster.severity.moneyCost;
    if (moneyCost === "high" || moneyCost === "medium") {
      gates.push(
        gate(
          "Expensive problem",
          "PASS",
          [`cluster.severity.moneyCost="${moneyCost}"`],
          `cluster.severity.moneyCost="${moneyCost}" -- a real, evidence-derived cost signal.`,
        ),
      );
    } else {
      gates.push(
        gate(
          "Expensive problem",
          "FAIL",
          [`cluster.severity.moneyCost="low"`],
          `cluster.severity.moneyCost="low" -- no meaningful cost signal evidenced.`,
        ),
      );
    }
  } else {
    const budgetEstimate = report.businessIntelligence.budgetEstimate;
    if (budgetEstimate === NOT_VERIFIED_SENTINEL) {
      gates.push(
        gate(
          "Expensive problem",
          "UNKNOWN",
          [`businessIntelligence.budgetEstimate="${NOT_VERIFIED_SENTINEL}"`],
          `cluster.severity is absent and businessIntelligence.budgetEstimate is the "${NOT_VERIFIED_SENTINEL}" sentinel -- no cost signal exists either way.`,
        ),
      );
    } else {
      gates.push(
        gate(
          "Expensive problem",
          "PASS",
          [`businessIntelligence.budgetEstimate="${budgetEstimate}"`],
          `cluster.severity is absent, but businessIntelligence.budgetEstimate carries a real extracted price: ${budgetEstimate}`,
        ),
      );
    }
  }

  /* 3. Actively trying to solve — cluster.rootCause==="Manual Process" or workaround-family signal */
  const conceptWorkaround = cluster?.conceptBreakdown?.some((c) => c.rootCause === "Manual Process") ?? false;
  const workaroundEvidenceExists =
    cluster?.rootCause === "Manual Process" || cluster?.category === "workaround" || conceptWorkaround;
  if (workaroundEvidenceExists) {
    gates.push(
      gate(
        "Actively trying to solve",
        "PASS",
        [
          cluster?.rootCause === "Manual Process" ? `cluster.rootCause="Manual Process"` : null,
          cluster?.category === "workaround" ? `cluster.category="workaround"` : null,
          conceptWorkaround ? "cluster.conceptBreakdown has a Manual Process entry" : null,
        ].filter((x): x is string => x !== null),
        "Real workaround-family evidence exists -- users are already actively trying to solve this themselves.",
      ),
    );
  } else {
    gates.push(
      gate(
        "Actively trying to solve",
        "UNKNOWN",
        [`cluster?.rootCause=${cluster?.rootCause ?? "undefined"}`, `cluster?.category="${cluster?.category ?? "unknown"}"`],
        "No workaround-family evidence (Manual Process root cause / workaround category / matching concept) was found -- this does not prove users aren't trying, so it is left UNKNOWN rather than guessed FAIL.",
      ),
    );
  }

  /* 4. Paying today — revenueIntelligence.pricingConfidence, cluster.category==="existing-spending" */
  const pricingConfidence = report.revenueIntelligence.pricingConfidence;
  if (pricingConfidence === "not-verified") {
    gates.push(
      gate(
        "Paying today",
        "UNKNOWN",
        [`revenueIntelligence.pricingConfidence="not-verified"`],
        "No pricing evidence exists to confirm anyone is paying for a comparable solution today.",
      ),
    );
  } else {
    const existingSpendingCategory = cluster?.category === "existing-spending";
    gates.push(
      gate(
        "Paying today",
        "PASS",
        [`revenueIntelligence.pricingConfidence="${pricingConfidence}"`, ...(existingSpendingCategory ? [`cluster.category="existing-spending"`] : [])],
        existingSpendingCategory
          ? `cluster.category="existing-spending" is direct evidence someone already pays for a comparable tool.`
          : `revenueIntelligence.pricingConfidence="${pricingConfidence}" (not "not-verified") -- real comparable pricing evidence exists.`,
      ),
    );
  }

  /* 5. Switching tools — cluster.category migration/looking-for-alternative, or competition.competitors.length>0 */
  const switchingCategory = report.category === "migration" || report.category === "looking-for-alternative";
  const hasCompetitors = report.competition.competitors.length > 0;
  if (switchingCategory || hasCompetitors) {
    gates.push(
      gate(
        "Switching tools",
        "PASS",
        [`report.category="${report.category}"`, `competition.competitors.length=${report.competition.competitors.length}`],
        switchingCategory
          ? `report.category="${report.category}" is direct evidence of active tool-switching.`
          : `competition.competitors.length=${report.competition.competitors.length} > 0 -- named competitors imply an existing tool landscape users could be switching from.`,
      ),
    );
  } else {
    gates.push(
      gate(
        "Switching tools",
        "UNKNOWN",
        [`report.category="${report.category}"`, "competition.competitors.length=0"],
        "No direct switching-category evidence and no named competitors -- absence of evidence, not proof users are loyal to an incumbent.",
      ),
    );
  }

  /* 6. Competitors failing — founderIntelligence.marketGaps, or "users solved it manually" counter-evidence claim NOT fired */
  const gaps = report.founderIntelligence.marketGaps;
  const manualClaim = report.aiDecisionValidation.counterEvidence.find((c) => c.claim === "users solved it manually");
  if (gaps.length > 0) {
    gates.push(
      gate(
        "Competitors failing",
        "PASS",
        [`founderIntelligence.marketGaps has ${gaps.length} entry(ies): ${gaps.map((g) => g.gap).join(", ")}`],
        `${gaps.length} evidence-backed market gap(s) show existing solutions are falling short.`,
      ),
    );
  } else if (manualClaim && !manualClaim.fired) {
    gates.push(
      gate(
        "Competitors failing",
        "PASS",
        [`aiDecisionValidation.counterEvidence["users solved it manually"].fired=false`],
        "No evidence users gave up and built their own manual workaround -- existing competing products are not evidenced as failing users into self-service.",
      ),
    );
  } else if (manualClaim && manualClaim.fired) {
    gates.push(
      gate(
        "Competitors failing",
        "FAIL",
        [`aiDecisionValidation.counterEvidence["users solved it manually"].fired=true: ${manualClaim.reason}`],
        "Users already found their own manual workaround outside of any competing product -- evidence points to no product (successful or failing) being the current substitute.",
      ),
    );
  } else {
    gates.push(
      gate(
        "Competitors failing",
        "UNKNOWN",
        ["no marketGaps and no matching counterEvidence claim found"],
        "Neither founderIntelligence.marketGaps nor the counter-evidence claim was available to evaluate this gate.",
      ),
    );
  }

  /* 7. Market growing — marketIntelligence.marketMaturity */
  const maturity = report.marketIntelligence.marketMaturity;
  if (maturity === "emerging" || maturity === "growing") {
    gates.push(
      gate("Market growing", "PASS", [`marketIntelligence.marketMaturity="${maturity}"`], `marketMaturity="${maturity}" is an open, still-growing market.`),
    );
  } else if (maturity === "saturated" || maturity === "declining") {
    gates.push(
      gate("Market growing", "FAIL", [`marketIntelligence.marketMaturity="${maturity}"`], `marketMaturity="${maturity}" -- the market is no longer growing.`),
    );
  } else {
    gates.push(
      gate(
        "Market growing",
        "UNKNOWN",
        [`marketIntelligence.marketMaturity="${maturity}"`],
        `marketMaturity="${maturity}" is neither the PASS set (emerging/growing) nor the FAIL set (saturated/declining) -- left UNKNOWN rather than guessed.`,
      ),
    );
  }

  /* 8. Better solution realistic — founderIntelligence.differentiationStrategies.length>0 */
  const strategies = report.founderIntelligence.differentiationStrategies;
  if (strategies.length > 0) {
    gates.push(
      gate(
        "Better solution realistic",
        "PASS",
        [`founderIntelligence.differentiationStrategies has ${strategies.length} entry(ies): ${strategies.map((s) => s.strategy).join(", ")}`],
        `${strategies.length} evidence-backed differentiation strategy(ies) exist.`,
      ),
    );
  } else {
    gates.push(
      gate(
        "Better solution realistic",
        "UNKNOWN",
        ["founderIntelligence.differentiationStrategies is empty"],
        "No differentiation strategy was found by founder-intelligence.ts's fixed detectors -- absence of a found strategy is not proof none exists, so this is UNKNOWN, not FAIL.",
      ),
    );
  }

  /* 9. Solo founder can build MVP — founderIntelligence.founderOpportunity.soloFounderSuitability (+ buildDifficulty.tier) */
  const suitability = report.founderIntelligence.founderOpportunity.soloFounderSuitability;
  const tier = report.buildDifficulty.tier;
  if (suitability === "high") {
    gates.push(
      gate(
        "Solo founder can build MVP",
        "PASS",
        [`founderOpportunity.soloFounderSuitability="high"`, `buildDifficulty.tier="${tier}"`],
        `soloFounderSuitability="high" -- a solo founder is well-suited to build this MVP.`,
      ),
    );
  } else if (suitability === "low") {
    gates.push(
      gate(
        "Solo founder can build MVP",
        "FAIL",
        [`founderOpportunity.soloFounderSuitability="low"`, `buildDifficulty.tier="${tier}"`],
        `soloFounderSuitability="low" -- this MVP is not realistically solo-buildable per founder-intelligence.ts's own synthesis.`,
      ),
    );
  } else {
    gates.push(
      gate(
        "Solo founder can build MVP",
        "UNKNOWN",
        [`founderOpportunity.soloFounderSuitability="medium"`, `buildDifficulty.tier="${tier}"`],
        `soloFounderSuitability="medium" is a genuine middle case -- neither a clear pass nor a clear fail.`,
      ),
    );
  }

  /* 10. Sufficient multi-source evidence — decision.evidence.uniqueSources>=2 AND !echoChamber */
  const uniqueSources = report.decision.evidence.uniqueSources;
  const echoChamber = report.decision.evidence.echoChamber;
  if (uniqueSources >= MIN_MULTI_SOURCE_COUNT && !echoChamber) {
    gates.push(
      gate(
        "Sufficient multi-source evidence",
        "PASS",
        [`decision.evidence.uniqueSources=${uniqueSources}`, "decision.evidence.echoChamber=false"],
        `uniqueSources=${uniqueSources} >= ${MIN_MULTI_SOURCE_COUNT} and echoChamber=false.`,
      ),
    );
  } else {
    gates.push(
      gate(
        "Sufficient multi-source evidence",
        "FAIL",
        [`decision.evidence.uniqueSources=${uniqueSources}`, `decision.evidence.echoChamber=${echoChamber}`],
        `uniqueSources=${uniqueSources} ${uniqueSources < MIN_MULTI_SOURCE_COUNT ? `< ${MIN_MULTI_SOURCE_COUNT}` : `>= ${MIN_MULTI_SOURCE_COUNT}`} and/or echoChamber=${echoChamber} -- insufficient independently-corroborated evidence.`,
      ),
    );
  }

  return gates;
}

/* ========================================================================= */
/* Part B — Elimination (rejection verdict)                                  */
/* ========================================================================= */

/**
 * Aggressive-by-design (per the mission): reject if ANY real signal fires.
 * Every reason cites the exact real, already-computed value that triggered
 * it. Deliberately reuses calibration.ts's own already-fired diagnostic
 * flags (never recomputing their thresholds) wherever one exists, matching
 * this module's "zero recomputation of anything upstream" mandate.
 *
 * NOTE on "Duplicate market": the mission lists `semanticCluster.mergedCount
 * > 1` as an alternative trigger, but explicitly calls it "handled
 * elsewhere" (semantic.ts's `mergeSynonymOpportunities` already consolidates
 * synonym collisions into one survivor BEFORE this module ever sees the
 * list). A high `mergedCount` on a surviving report is a GOOD signal (strong
 * multi-mention corroboration), not a rejection reason — firing elimination
 * on it would punish exactly the opportunities this codebase's own upstream
 * dedup logic worked to strengthen. This is therefore a deliberate, logged
 * decision to implement ONLY the second half of that criterion (high named
 * competitor count + saturated market), not the `mergedCount` half.
 */
export function computeElimination(report: FounderOpportunityReport, cluster: ProblemCluster | undefined): EliminationVerdict {
  const reasons: string[] = [];
  const { calibration, decision, founderIntelligence, revenueIntelligence, businessIntelligence, competition } = report;

  const flag = (name: string) => calibration.diagnostics.find((d) => d.flag === name);

  const newsSpike = flag("News Spike");
  if (newsSpike?.fired) {
    reasons.push(`Noise/tutorial/news-only: calibration diagnostic "News Spike" fired -- ${newsSpike.reason}`);
  }

  const trendingOnly = flag("Trending-only");
  if (cluster?.trending === true && trendingOnly?.fired) {
    reasons.push(`Trend-only: cluster.trending=true AND calibration diagnostic "Trending-only" fired -- ${trendingOnly.reason}`);
  }

  const lowDiversity = flag("Low Diversity");
  if (lowDiversity?.fired) {
    reasons.push(
      `Single source: decision.evidence.uniqueSources=${decision.evidence.uniqueSources} -- calibration diagnostic "Low Diversity" fired (< ${MIN_MULTI_SOURCE_COUNT}).`,
    );
  }

  const weakEvidence = flag("Weak Evidence");
  if (weakEvidence?.fired) {
    reasons.push(`Weak evidence: calibration diagnostic "Weak Evidence" fired -- ${weakEvidence.reason}`);
  }

  const weakBuyingIntent = flag("Weak Buying Intent");
  if (weakBuyingIntent?.fired) {
    reasons.push(`Weak buying intent: calibration diagnostic "Weak Buying Intent" fired -- ${weakBuyingIntent.reason}`);
  }

  if (founderIntelligence.differentiationStrategies.length === 0) {
    reasons.push("No differentiation: founderIntelligence.differentiationStrategies is empty (0 evidence-backed strategies).");
  }

  const noViableBusiness =
    revenueIntelligence.revenuePotential === NOT_VERIFIED_SENTINEL &&
    businessIntelligence.budgetEstimate === NOT_VERIFIED_SENTINEL &&
    businessIntelligence.expansionPotential === "not-verified";
  if (noViableBusiness) {
    reasons.push(
      `No realistic business: revenueIntelligence.revenuePotential="${NOT_VERIFIED_SENTINEL}", businessIntelligence.budgetEstimate="${NOT_VERIFIED_SENTINEL}", and businessIntelligence.expansionPotential="not-verified" -- no revenue signal exists anywhere on this report.`,
    );
  }

  const saturatedCrowded =
    competition.competitors.length >= COMPETITOR_COUNT_HIGH_THRESHOLD && founderIntelligence.marketMaturity.maturity === "saturated";
  if (saturatedCrowded) {
    reasons.push(
      `Duplicate/saturated market: competition.competitors.length=${competition.competitors.length} (>= ${COMPETITOR_COUNT_HIGH_THRESHOLD}) AND founderIntelligence.marketMaturity.maturity="saturated".`,
    );
  }

  if (report.category === "praise") {
    reasons.push(`Already-solved-with-strong-satisfaction: report.category="praise" -- the dominant signal for this cluster is satisfaction, not pain.`);
  }

  return { rejected: reasons.length > 0, reasons };
}

/* ========================================================================= */
/* Part C — Differentiation Engine                                          */
/* ========================================================================= */

function gapTexts(gaps: FounderOpportunityReport["founderIntelligence"]["marketGaps"], name: MarketGapName): string[] {
  return gaps.filter((g) => g.gap === name).map((g) => `${g.gap} (${g.evidenceCount} evidence item(s), confidence=${g.confidence})`);
}

/** Cheap composition over already-computed differentiation/gap/competitor fields — never a new detection pass. */
export function computeDifferentiationEngine(
  report: FounderOpportunityReport,
  cluster: ProblemCluster | undefined,
): DifferentiationEngineResult {
  const { founderIntelligence, competition } = report;
  const currentSolution = competition.competitors[0]?.name ?? "no named competitor evidenced";

  const pressure = founderIntelligence.competitionPressure.pressure;
  const isSwitchingCategory = report.category === "migration" || report.category === "looking-for-alternative";
  const whyUsersStillUseIt = isSwitchingCategory
    ? `Some evidence of active switching exists (report.category="${report.category}"), but founderIntelligence.competitionPressure.pressure="${pressure}" -- "${currentSolution}" may still retain switching-cost inertia for the rest of the market.`
    : `No direct evidence of active switching away from "${currentSolution}" was found (report.category="${report.category}"); founderIntelligence.competitionPressure.pressure="${pressure}" (${founderIntelligence.competitionPressure.explanation})`;

  const gaps = founderIntelligence.marketGaps;

  const biggestComplaints =
    cluster?.symptoms && cluster.symptoms.length > 0
      ? [...cluster.symptoms]
      : ["No raw symptom phrases were captured for this cluster (cluster.symptoms is absent/empty)."];

  const missingFeatures = gapTexts(gaps, "Missing Features");
  const pricingComplaints = gapTexts(gaps, "Expensive Pricing");
  const manualWorkarounds = [
    ...gapTexts(gaps, "Manual Workflow"),
    ...(cluster?.rootCause === "Manual Process" ? [`cluster.rootCause="Manual Process": ${cluster.normalizedStatement}`] : []),
  ];

  // Fixed gap-name -> opportunity-bucket lookup (documented, not new detection): "Missing AI" -> aiOpportunities, "Poor Automation" -> automationOpportunities, "Complex UX" -> uxOpportunities, "Manual Workflow" -> workflowOpportunities.
  const aiOpportunities = gapTexts(gaps, "Missing AI");
  const automationOpportunities = gapTexts(gaps, "Poor Automation");
  const uxOpportunities = gapTexts(gaps, "Complex UX");
  const workflowOpportunities = gapTexts(gaps, "Manual Workflow");

  const strategies = founderIntelligence.differentiationStrategies;
  const gapCount = gaps.length;
  const whyUsersWouldSwitch =
    gapCount > 0 || strategies.length > 0
      ? `${gapCount} evidence-backed market gap(s) in "${currentSolution}" (${gaps.map((g) => g.gap).join(", ") || "none"}) plus ${strategies.length} evidence-backed differentiation strategy(ies) (${strategies.map((s) => s.strategy).join(", ") || "none"}) give a concrete reason to switch.`
      : `No evidence-backed market gap or differentiation strategy currently exists for this opportunity -- no concrete switching reason has been established yet.`;

  return {
    currentSolution,
    whyUsersStillUseIt,
    biggestComplaints,
    missingFeatures,
    pricingComplaints,
    manualWorkarounds,
    aiOpportunities,
    automationOpportunities,
    uxOpportunities,
    workflowOpportunities,
    whyUsersWouldSwitch,
  };
}

/* ========================================================================= */
/* Part D — Market Replacement Analysis                                     */
/* ========================================================================= */

/** 1=low friction, 2=medium, 3=high; `null` (excluded from the average) for "unknown". */
const FRICTION_SCORE: Record<FrictionTier, number | null> = { low: 1, medium: 2, high: 3, unknown: null };
/** Average friction score (1-3) at/below this -> "high" replacementFeasibility (low friction = easy to replace the incumbent). */
const REPLACEMENT_FEASIBILITY_HIGH_MAX_FRICTION = 1.5;
/** Average friction score (1-3) at/below this (and above HIGH) -> "medium". */
const REPLACEMENT_FEASIBILITY_MEDIUM_MAX_FRICTION = 2.5;

function escalateForCompetitorCount(tier: FrictionTier, competitorCount: number): FrictionTier {
  if (tier === "unknown") return "unknown";
  if (competitorCount < COMPETITOR_COUNT_HIGH_THRESHOLD) return tier;
  if (tier === "low") return "medium";
  return "high"; // medium or high both escalate to/stay at "high"
}

/**
 * Every tier is derived from `businessIntelligence.switchingDifficulty` +
 * `competition.competitors.length` + `report.technicalBlueprint` (all
 * already computed, read-only here) — see each helper below for the exact
 * documented rule. `replacementFeasibility` is a fixed, documented composite:
 * the average friction score (1=low, 2=medium, 3=high) across whichever of
 * the 5 tiers are NOT "unknown"; lower average friction = higher feasibility
 * for a new entrant to replace the incumbent.
 */
export function computeMarketReplacementAnalysis(report: FounderOpportunityReport): MarketReplacementAnalysis {
  const { businessIntelligence, competition, founderIntelligence, technicalBlueprint, buildDifficulty } = report;
  const switchingDifficulty = businessIntelligence.switchingDifficulty;
  const competitorCount = competition.competitors.length;
  const marketGapNames = new Set(founderIntelligence.marketGaps.map((g) => g.gap));
  const mvpComplexity = technicalBlueprint.expectedMvpComplexity; // "low" | "medium" | "high"

  const switchFriction: FrictionTier = switchingDifficulty;
  const switchFrictionReason = `Reused verbatim from businessIntelligence.switchingDifficulty="${switchingDifficulty}" (${businessIntelligence.switchingDifficultyReason})`;

  const migrationDifficulty = escalateForCompetitorCount(switchingDifficulty, competitorCount);
  const migrationDifficultyReason =
    competitorCount >= COMPETITOR_COUNT_HIGH_THRESHOLD && switchingDifficulty !== "unknown"
      ? `businessIntelligence.switchingDifficulty="${switchingDifficulty}" escalated one tier because competition.competitors.length=${competitorCount} >= ${COMPETITOR_COUNT_HIGH_THRESHOLD} (more established incumbents typically mean more entrenched migration data/process) -> "${migrationDifficulty}".`
      : `businessIntelligence.switchingDifficulty="${switchingDifficulty}" left unescalated because competition.competitors.length=${competitorCount} < ${COMPETITOR_COUNT_HIGH_THRESHOLD} (or switchingDifficulty is itself "unknown") -> "${migrationDifficulty}".`;

  const hasIntegrationGap = marketGapNames.has("Weak Integrations") || marketGapNames.has("Missing API");
  const integrationDependency: FrictionTier = hasIntegrationGap ? (competitorCount > 0 ? "high" : "medium") : "unknown";
  const integrationDependencyReason = hasIntegrationGap
    ? `founderIntelligence.marketGaps includes ${["Weak Integrations", "Missing API"].filter((n) => marketGapNames.has(n as MarketGapName)).join(", ")} -- ${
        competitorCount > 0
          ? `combined with competition.competitors.length=${competitorCount} > 0, an incumbent already serves this integration surface -> high dependency.`
          : "no named competitor yet serves this integration surface -> medium dependency."
      }`
    : `founderIntelligence.marketGaps contains neither "Weak Integrations" nor "Missing API" -- no evidence of integration dependency either way.`;

  const learningCurve: FrictionTier = mvpComplexity;
  const learningCurveReason = `Reused verbatim from technicalBlueprint.expectedMvpComplexity="${mvpComplexity}" (buildDifficulty.tier="${buildDifficulty.tier}").`;

  const companySize = businessIntelligence.companySize;
  const lockInRisk: FrictionTier = switchingDifficulty === "high" ? "high" : companySize === "enterprise" ? "medium" : switchingDifficulty;
  const lockInRiskReason =
    switchingDifficulty === "high"
      ? `businessIntelligence.switchingDifficulty="high" -> high lock-in risk.`
      : companySize === "enterprise"
        ? `businessIntelligence.companySize="enterprise" (switchingDifficulty="${switchingDifficulty}") -> bumped to medium lock-in risk (enterprise procurement typically entrenches vendor choice).`
        : `businessIntelligence.switchingDifficulty="${switchingDifficulty}" and companySize="${companySize}" (not enterprise) -> lock-in risk mirrors switchingDifficulty.`;

  const tierNames = ["switchFriction", "migrationDifficulty", "integrationDependency", "learningCurve", "lockInRisk"] as const;
  const tiers: FrictionTier[] = [switchFriction, migrationDifficulty, integrationDependency, learningCurve, lockInRisk];
  const knownScores = tiers.map((t) => FRICTION_SCORE[t]).filter((s): s is number => s !== null);

  let replacementFeasibility: "high" | "medium" | "low" | "unknown";
  let replacementFeasibilityReason: string;
  if (knownScores.length === 0) {
    replacementFeasibility = "unknown";
    replacementFeasibilityReason = `All 5 friction tiers are "unknown" -- no signal to compute a composite.`;
  } else {
    const avg = knownScores.reduce((sum, v) => sum + v, 0) / knownScores.length;
    replacementFeasibility =
      avg <= REPLACEMENT_FEASIBILITY_HIGH_MAX_FRICTION ? "high" : avg <= REPLACEMENT_FEASIBILITY_MEDIUM_MAX_FRICTION ? "medium" : "low";
    replacementFeasibilityReason = `Average friction score across ${knownScores.length}/5 known tier(s) (${tierNames.map((n, i) => `${n}=${tiers[i]}`).join(", ")}) = ${avg.toFixed(2)} (1=low,2=medium,3=high friction) -> replacementFeasibility="${replacementFeasibility}" (lower friction = higher feasibility for a new entrant to replace the incumbent).`;
  }

  return {
    switchFriction,
    switchFrictionReason,
    migrationDifficulty,
    migrationDifficultyReason,
    integrationDependency,
    integrationDependencyReason,
    learningCurve,
    learningCurveReason,
    lockInRisk,
    lockInRiskReason,
    replacementFeasibility,
    replacementFeasibilityReason,
  };
}

/* ========================================================================= */
/* Part E — Business Viability                                              */
/* ========================================================================= */

/** businessViability's internal 0-5 scoring scale thresholds — reasoned defaults, not empirically tuned (see module doc). */
const VIABILITY_HIGH_MIN_SCORE = 3.5;
const VIABILITY_MEDIUM_MIN_SCORE = 1.5;

/**
 * A pure re-composition of `revenueIntelligence`/`businessIntelligence`
 * fields already computed elsewhere. `retentionLikelihood` is ALWAYS
 * `"unknown"` — this codebase has never measured a churn/retention signal
 * anywhere upstream (no session/usage-over-time field exists on
 * `RawResearchItem` or `ProblemCluster`), so it is honestly reported rather
 * than invented.
 */
export function computeBusinessViability(report: FounderOpportunityReport, cluster: ProblemCluster | undefined): BusinessViabilityResult {
  const { businessIntelligence, revenueIntelligence, supportingEvidence } = report;
  const revenueModel = businessIntelligence.revenueModel;
  const pricingConfidence = revenueIntelligence.pricingConfidence;
  const customerUrgency = businessIntelligence.urgency;

  const businessFrequency = cluster ? cluster.frequency.mentions : supportingEvidence.evidenceCount;
  const businessFrequencyReason = cluster
    ? `cluster.frequency.mentions=${cluster.frequency.mentions}.`
    : `Source cluster unavailable -- falling back to report.supportingEvidence.evidenceCount=${supportingEvidence.evidenceCount} as the closest already-computed proxy for mention frequency.`;

  const retentionLikelihood = "unknown" as const;
  const retentionLikelihoodReason =
    "No churn/retention signal has ever been measured anywhere upstream in this codebase (no session/usage-over-time field exists on RawResearchItem or ProblemCluster) -- honestly reported as unknown rather than invented.";

  const expansionPotential = businessIntelligence.expansionPotential;
  const expansionPotentialReason = `Reused verbatim from businessIntelligence.expansionPotential="${expansionPotential}" (== revenueIntelligence.expansionPotential, both sourced from aiDecisionValidation.monetization.enterprisePotential).`;

  const pricingScore = pricingConfidence === "high" ? 2 : pricingConfidence === "medium" ? 1.5 : pricingConfidence === "low" ? 1 : 0;
  const urgencyScore = customerUrgency === "high" ? 2 : customerUrgency === "medium" ? 1 : 0;
  const expansionScore = expansionPotential === "supported" ? 1 : 0;
  const totalScore = pricingScore + urgencyScore + expansionScore;

  let viabilityTier: "high" | "medium" | "low" | "unknown";
  if (totalScore === 0) {
    viabilityTier = "unknown";
  } else if (totalScore >= VIABILITY_HIGH_MIN_SCORE) {
    viabilityTier = "high";
  } else if (totalScore >= VIABILITY_MEDIUM_MIN_SCORE) {
    viabilityTier = "medium";
  } else {
    viabilityTier = "low";
  }
  const viabilityTierReason =
    totalScore === 0
      ? `pricingConfidence="${pricingConfidence}", customerUrgency="${customerUrgency}", expansionPotential="${expansionPotential}" all score 0 -- no viability signal fired at all, honestly reported as unknown.`
      : `pricingConfidence="${pricingConfidence}" (${pricingScore}) + customerUrgency="${customerUrgency}" (${urgencyScore}) + expansionPotential="${expansionPotential}" (${expansionScore}) = ${totalScore}/5 -> viabilityTier="${viabilityTier}" (>= ${VIABILITY_HIGH_MIN_SCORE}=high, >= ${VIABILITY_MEDIUM_MIN_SCORE}=medium).`;

  return {
    revenueModel,
    pricingConfidence,
    customerUrgency,
    businessFrequency,
    businessFrequencyReason,
    retentionLikelihood,
    retentionLikelihoodReason,
    expansionPotential,
    expansionPotentialReason,
    viabilityTier,
    viabilityTierReason,
  };
}

/* ========================================================================= */
/* Part F — High Conviction Score (NEW, additive, 0-100)                    */
/* ========================================================================= */

/**
 * Fixed dimension weights — sum to exactly 1.0 (asserted in
 * opportunity-selection.test.ts). Each weight is a reasoned default, not an
 * empirically tuned value (no labeled founder-outcome dataset was
 * available, matching fois.ts's own weight-rationale philosophy). This
 * score is DISTINCT from `fois.overall` — fois.ts is never touched by this
 * module.
 */
const HCS_WEIGHTS = {
  // The root justification for building anything, mirroring fois.ts's own
  // top-weighted businessPain dimension.
  problemStrength: 0.15,
  // Willingness to pay is the strongest direct signal of a viable business.
  buyingIntent: 0.15,
  // How much to trust every other dimension — a cross-cutting quality gate.
  evidenceQuality: 0.15,
  // A concrete, evidence-backed reason a customer would switch.
  differentiation: 0.1,
  // How feasible it actually is to displace the incumbent (Part D composite).
  replacementFeasibility: 0.1,
  // Whether the window is opening or closing.
  marketGrowth: 0.15,
  // Whether a real, evidence-backed business model exists (Part E composite).
  businessViability: 0.1,
  // Penalizes for likely-false-positive calibration signals — a founder
  // should trust a high score only if it's stable, not artificially inflated.
  confidenceStability: 0.1,
} as const;

const HCS_WEIGHT_SUM = Object.values(HCS_WEIGHTS).reduce((sum, w) => sum + w, 0);
if (Math.abs(HCS_WEIGHT_SUM - 1) > 1e-9) {
  // Fail loudly at import time rather than silently mis-scaling the score —
  // mirrors fois.ts's own identical guard.
  throw new Error(`High Conviction Score dimension weights must sum to 1.0, got ${HCS_WEIGHT_SUM}`);
}

/** raw score (0-100) per `GrowthStageLabel` for the marketGrowth dimension — "insufficient-data" is treated as neutral (40), never guessed toward growth or decline. */
const GROWTH_STAGE_SCORE: Record<GrowthStageLabel, number> = {
  early: 90,
  growing: 80,
  plateauing: 50,
  declining: 10,
  "insufficient-data": 40,
};

/** raw score (0-100) per composite tier, shared by the replacementFeasibility and businessViability dimensions — "unknown" is treated as neutral (40), never guessed. */
const TIER_SCORE: Record<"high" | "medium" | "low" | "unknown", number> = { high: 90, medium: 55, low: 20, unknown: 40 };

/** Points credited per evidence-backed differentiation strategy toward the differentiation dimension's raw score, capped at 100 (3 strategies reaches the cap). */
const DIFFERENTIATION_SCORE_PER_STRATEGY = 34;

/** Points subtracted from confidenceStability's raw score when `calibration.falsePositive.likely` is true. */
const FALSE_POSITIVE_PENALTY_POINTS = 20;

function dimension(name: string, raw: number, weight: number, reason: string): HighConvictionScoreDimension {
  const clamped = clamp(raw, 0, 100);
  return { name, raw: clamped, weight, weighted: clamped * weight, reason };
}

/**
 * 8 named dimensions, weights summing to 1.0 — see `HCS_WEIGHTS` above for
 * each weight's rationale. Every dimension composes exclusively from fields
 * already computed on `report`/`cluster` (Part D/E composites are computed
 * internally here, themselves pure compositions). This score is DISTINCT
 * from `fois.overall` — a new, separate, additive score living only in this
 * module.
 */
export function computeHighConvictionScore(report: FounderOpportunityReport, cluster: ProblemCluster | undefined): HighConvictionScore {
  const dims: HighConvictionScoreDimension[] = [];

  const businessPainDim = report.fois.dimensions.find((d) => d.name === "businessPain");
  const severityRaw = cluster?.severity?.severity;
  const problemStrengthRaw = severityRaw ?? businessPainDim?.raw ?? 0;
  dims.push(
    dimension(
      "problemStrength",
      problemStrengthRaw,
      HCS_WEIGHTS.problemStrength,
      severityRaw !== undefined
        ? `cluster.severity.severity=${severityRaw}/100${cluster?.rootCause ? ` (rootCause="${cluster.rootCause}")` : ""}.`
        : `cluster.severity is absent -- falling back to fois.dimensions["businessPain"].raw=${businessPainDim?.raw ?? 0}/100 as the closest already-computed pain proxy.`,
    ),
  );

  const buyingIntentRaw = report.buyingIntent.score * 100;
  dims.push(
    dimension(
      "buyingIntent",
      buyingIntentRaw,
      HCS_WEIGHTS.buyingIntent,
      `buyingIntent.score=${report.buyingIntent.score.toFixed(2)} * 100 = ${buyingIntentRaw.toFixed(0)}/100.`,
    ),
  );

  const evidenceQualityScore = cluster?.evidenceQualityScore;
  const evidenceQualityRaw = evidenceQualityScore !== undefined ? evidenceQualityScore * 100 : report.calibration.metrics.crossSourceConsistency * 100;
  dims.push(
    dimension(
      "evidenceQuality",
      evidenceQualityRaw,
      HCS_WEIGHTS.evidenceQuality,
      evidenceQualityScore !== undefined
        ? `cluster.evidenceQualityScore=${evidenceQualityScore.toFixed(2)} * 100 = ${evidenceQualityRaw.toFixed(0)}/100.`
        : `cluster.evidenceQualityScore is absent -- falling back to calibration.metrics.crossSourceConsistency=${report.calibration.metrics.crossSourceConsistency.toFixed(2)} * 100 = ${evidenceQualityRaw.toFixed(0)}/100.`,
    ),
  );

  const strategyCount = report.founderIntelligence.differentiationStrategies.length;
  const differentiationRaw = strategyCount * DIFFERENTIATION_SCORE_PER_STRATEGY;
  dims.push(
    dimension(
      "differentiation",
      differentiationRaw,
      HCS_WEIGHTS.differentiation,
      `founderIntelligence.differentiationStrategies has ${strategyCount} evidence-backed strategy(ies) (${
        report.founderIntelligence.differentiationStrategies.map((s) => s.strategy).join(", ") || "none"
      }) * ${DIFFERENTIATION_SCORE_PER_STRATEGY} = ${clamp(differentiationRaw, 0, 100)}/100.`,
    ),
  );

  const marketReplacement = computeMarketReplacementAnalysis(report);
  const replacementRaw = TIER_SCORE[marketReplacement.replacementFeasibility];
  dims.push(
    dimension(
      "replacementFeasibility",
      replacementRaw,
      HCS_WEIGHTS.replacementFeasibility,
      `Part D composite replacementFeasibility="${marketReplacement.replacementFeasibility}" -> ${replacementRaw}/100 (${marketReplacement.replacementFeasibilityReason})`,
    ),
  );

  const growthStage = report.marketIntelligence.growthStage;
  const marketGrowthRaw = GROWTH_STAGE_SCORE[growthStage];
  dims.push(
    dimension(
      "marketGrowth",
      marketGrowthRaw,
      HCS_WEIGHTS.marketGrowth,
      `marketIntelligence.growthStage="${growthStage}" -> ${marketGrowthRaw}/100 (${report.marketIntelligence.growthStageReason})`,
    ),
  );

  const businessViability = computeBusinessViability(report, cluster);
  const viabilityRaw = TIER_SCORE[businessViability.viabilityTier];
  dims.push(
    dimension(
      "businessViability",
      viabilityRaw,
      HCS_WEIGHTS.businessViability,
      `Part E composite viabilityTier="${businessViability.viabilityTier}" -> ${viabilityRaw}/100 (${businessViability.viabilityTierReason})`,
    ),
  );

  const baseConfidence = report.decision.confidence.score;
  const penalized = report.calibration.falsePositive.likely;
  const confidenceRaw = clamp(baseConfidence - (penalized ? FALSE_POSITIVE_PENALTY_POINTS : 0), 0, 100);
  dims.push(
    dimension(
      "confidenceStability",
      confidenceRaw,
      HCS_WEIGHTS.confidenceStability,
      `decision.confidence.score=${baseConfidence}/100${
        penalized
          ? ` minus a ${FALSE_POSITIVE_PENALTY_POINTS}-point penalty (calibration.falsePositive.likely=true: ${report.calibration.falsePositive.reasons.join("; ")})`
          : " (calibration.falsePositive.likely=false, no penalty)"
      } -> ${confidenceRaw.toFixed(0)}/100.`,
    ),
  );

  const overall = clamp(Math.round(dims.reduce((sum, d) => sum + d.weighted, 0)), 0, 100);
  return { overall, dimensions: dims };
}

/* ========================================================================= */
/* Part H — Self Critique (survivors only)                                  */
/* ========================================================================= */

/** Fixed gate-name -> recommended customer-interview question lookup, used to build `customerInterviewsRequired` from any UNKNOWN qualification gate. */
const GATE_TO_INTERVIEW_QUESTION: Record<string, string> = {
  "Recurring problem": "Interview to confirm the problem still recurs regularly, not just historically.",
  "Expensive problem": "Interview to quantify the real dollar/time cost this problem imposes today.",
  "Actively trying to solve": "Interview to learn what workaround (if any) they currently use.",
  "Paying today": "Interview to confirm willingness to pay and what they currently pay for a comparable tool.",
  "Switching tools": "Interview to learn whether they are actively evaluating alternatives.",
  "Competitors failing": "Interview to learn specifically where existing tools fall short for them.",
  "Market growing": "Interview a broader sample to confirm whether demand is actually growing.",
  "Better solution realistic": "Interview to validate which differentiator would actually change their buying decision.",
  "Solo founder can build MVP": "Interview to scope the true minimum feature set a solo founder could ship.",
  "Sufficient multi-source evidence": "Interview across additional channels/sources to reduce single-source risk.",
};

/**
 * Composed ONLY for survivors (see Part G) — every field reuses already-
 * computed `aiDecisionValidation`/`decision`/`calibration` fields, never a
 * new derivation.
 */
function buildSelfCritique(report: FounderOpportunityReport, gates: QualificationGate[]): SelfCritique {
  const { decision, aiDecisionValidation, calibration, businessIntelligence, revenueIntelligence } = report;

  const reasonsToBuild = Array.from(
    new Set(
      [decision.recommendation.justification, decision.reasoning.whyThisMatters, decision.reasoning.whyFoundersPay, aiDecisionValidation.explainability.whyBuild].filter(
        (s): s is string => Boolean(s && s.length > 0),
      ),
    ),
  );

  const firedCounter = aiDecisionValidation.counterEvidence.filter((c) => c.fired);
  const reasonsNotToBuild =
    firedCounter.length > 0
      ? firedCounter.map((c) => `"${c.claim}": ${c.reason}`)
      : ["No counter-evidence claim fired against this opportunity (0/5 in aiDecisionValidation.counterEvidence)."];

  const strongestRiskEntry = [...aiDecisionValidation.risks].sort((a, b) => b.score - a.score)[0];
  const strongestRisk = strongestRiskEntry
    ? { risk: strongestRiskEntry.risk, score: strongestRiskEntry.score, reason: strongestRiskEntry.reason }
    : { risk: "UNKNOWN", score: 0, reason: "aiDecisionValidation.risks is unexpectedly empty." };

  const strongestUnknown =
    aiDecisionValidation.finalRecommendation.unknowns[0] ?? "No unresolved unknown was surfaced by Module 9's collectUnknowns for this opportunity.";

  const evidenceStillMissing: string[] = [...calibration.diagnostics.filter((d) => d.fired).map((d) => `Calibration diagnostic "${d.flag}" fired: ${d.reason}`)];
  if (businessIntelligence.budgetEstimate === NOT_VERIFIED_SENTINEL) {
    evidenceStillMissing.push(`businessIntelligence.budgetEstimate="${NOT_VERIFIED_SENTINEL}" -- no real price point extracted from evidence.`);
  }
  if (revenueIntelligence.revenuePotential === NOT_VERIFIED_SENTINEL) {
    evidenceStillMissing.push(`revenueIntelligence.revenuePotential="${NOT_VERIFIED_SENTINEL}" -- fois's commercialPotential dimension was unexpectedly absent.`);
  }
  if (revenueIntelligence.possiblePricing.includes(NOT_VERIFIED_SENTINEL)) {
    evidenceStillMissing.push(`revenueIntelligence.possiblePricing contains "${NOT_VERIFIED_SENTINEL}" -- no comparable pricing evidence was collected.`);
  }
  if (evidenceStillMissing.length === 0) {
    evidenceStillMissing.push("No calibration diagnostic fired and no NOT VERIFIED sentinel present for this opportunity.");
  }

  const customerInterviewsRequired = Array.from(
    new Set(
      gates
        .filter((g) => g.status === "UNKNOWN")
        .map((g) => GATE_TO_INTERVIEW_QUESTION[g.gate] ?? `Interview to resolve the "${g.gate}" qualification gate (currently UNKNOWN).`),
    ),
  );
  if (customerInterviewsRequired.length === 0) {
    customerInterviewsRequired.push("No additional customer interviews flagged as required -- every qualification gate resolved to PASS or FAIL.");
  }

  return { reasonsToBuild, reasonsNotToBuild, strongestRisk, strongestUnknown, evidenceStillMissing, customerInterviewsRequired };
}

/* ========================================================================= */
/* Part G — Survivor Ranking (whole-list)                                   */
/* ========================================================================= */

/**
 * Whole-list reduction: filters out Part B eliminations first, ranks the
 * remainder by High Conviction Score descending, returns the top
 * `MAX_SURVIVORS` as survivors (each with a real, cited `whySurvived` reason
 * and Part H self-critique), and ALL rejected ones (both Part-B-eliminated
 * and lower-ranked survivors past the cap) with their real
 * rejection/non-selection reason. Read-only over `reports` — never mutates
 * any report, never changes engine.ts's own shipped `opportunities` order.
 *
 * See this module's top-of-file doc for why `clusters` is a required second
 * argument (mirrors `attachFounderIntelligence`/`attachAiDecisionValidation`).
 */
export function selectTopOpportunities(reports: FounderOpportunityReport[], clusters: ProblemCluster[]): OpportunitySelectionResult {
  const clusterById = new Map(clusters.map((c) => [c.id, c] as const));
  const rejected: OpportunitySelectionRejected[] = [];
  const qualifying: Array<{ report: FounderOpportunityReport; cluster: ProblemCluster | undefined; hcs: HighConvictionScore }> = [];

  for (const report of reports) {
    const cluster = clusterById.get(report.clusterId);
    const elimination = computeElimination(report, cluster);
    if (elimination.rejected) {
      rejected.push({ reportId: report.id, whyRejected: elimination.reasons });
      continue;
    }
    qualifying.push({ report, cluster, hcs: computeHighConvictionScore(report, cluster) });
  }

  qualifying.sort((a, b) => b.hcs.overall - a.hcs.overall);
  const total = qualifying.length;

  const survivors: OpportunitySelectionSurvivor[] = qualifying.slice(0, MAX_SURVIVORS).map((entry, index) => {
    const gates = computeQualificationGates(entry.report, entry.cluster);
    const selfCritique = buildSelfCritique(entry.report, gates);
    const topDims = [...entry.hcs.dimensions].sort((a, b) => b.weighted - a.weighted).slice(0, 2);
    const whySurvived = `Ranked #${index + 1} of ${total} qualifying candidate(s) with a High Conviction Score of ${entry.hcs.overall}/100, driven primarily by ${topDims
      .map((d) => `${d.name} (${d.weighted.toFixed(1)}/100 weighted)`)
      .join(" and ")}.`;
    return { report: entry.report, highConvictionScore: entry.hcs, whySurvived, selfCritique };
  });

  qualifying.slice(MAX_SURVIVORS).forEach((entry, index) => {
    rejected.push({
      reportId: entry.report.id,
      whyRejected: [
        `Ranked #${MAX_SURVIVORS + index + 1} of ${total} qualifying candidate(s) with a High Conviction Score of ${entry.hcs.overall}/100 -- below the top ${MAX_SURVIVORS} survivor cap.`,
      ],
    });
  });

  return { survivors, rejected };
}
