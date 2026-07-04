import type { BuildDifficultyTier, FounderOpportunityReport } from "./types.js";

/**
 * Phase 4 — MVP Scope Generator.
 *
 * A pure COMPOSITION layer over
 * `aiDecisionValidation.founderOpportunity.topMvpFeatures`/`featuresToAvoid`,
 * `founderIntelligence.marketGaps`, `report.buildDifficulty`,
 * `report.recommendedMvp`, and `report.estimatedTimeToMvp` — all already
 * computed elsewhere and read-only here. No LLM call, no network, no
 * filesystem writes, no re-scan of raw evidence items, no re-derivation of
 * clustering/FOIS/decision/calibration/founderIntelligence/
 * aiDecisionValidation. Every returned field cites the real, already-computed
 * value it is composed from.
 */

/* ========================================================================= */
/* Phased roadmap                                                           */
/* ========================================================================= */

export interface MvpPhase {
  phase: string;
  features: string[];
  reason: string;
}

/**
 * Splits `founderIntelligence.marketGaps` (already sorted by evidenceCount
 * desc, per founder-intelligence.ts's `detectMarketGaps`) into:
 *   Phase 1 (MVP launch)   — the gaps already selected as
 *                            `aiDecisionValidation.founderOpportunity.topMvpFeatures`
 *                            (capped at TOP_MVP_FEATURE_CAP=3 upstream).
 *   Phase 2 (post-launch)  — any remaining evidenced gaps not already in
 *                            Phase 1 — real evidence, just lower priority.
 *   Phase 3 (deferred)     — `featuresToAvoid` (buildDifficulty's matched
 *                            high-complexity signals, reused verbatim) —
 *                            deferred until the MVP's core is validated.
 */
function buildPhasedRoadmap(params: {
  topMvpFeatures: string[];
  marketGapDescriptions: string[];
  featuresToAvoid: string[];
}): MvpPhase[] {
  const { topMvpFeatures, marketGapDescriptions, featuresToAvoid } = params;

  const phase1: MvpPhase = {
    phase: "Phase 1 — MVP launch",
    features: topMvpFeatures,
    reason:
      topMvpFeatures.length > 0
        ? `Reused verbatim from aiDecisionValidation.founderOpportunity.topMvpFeatures (top ${topMvpFeatures.length} evidence-backed market gap(s), by evidenceCount).`
        : "aiDecisionValidation.founderOpportunity.topMvpFeatures is empty (no evidenced market gap exists) -> no core feature set could be composed without inventing one.",
  };

  const phase1Set = new Set(topMvpFeatures);
  const remainingGaps = marketGapDescriptions.filter((description) => !phase1Set.has(description));
  const phase2: MvpPhase = {
    phase: "Phase 2 — post-launch",
    features: remainingGaps,
    reason:
      remainingGaps.length > 0
        ? `Remaining founderIntelligence.marketGaps entries not already selected for Phase 1 (${remainingGaps.length} gap(s)) — real evidence, lower launch priority.`
        : "No remaining founderIntelligence.marketGaps entries beyond Phase 1 — either no further gaps were evidenced, or all evidenced gaps are already in Phase 1.",
  };

  const phase3: MvpPhase = {
    phase: "Phase 3 — deferred until MVP core is validated",
    features: featuresToAvoid,
    reason:
      featuresToAvoid.length > 0
        ? `Reused verbatim from aiDecisionValidation.founderOpportunity.featuresToAvoid (buildDifficulty's matched high-complexity signal(s)) — deferred, not abandoned.`
        : "aiDecisionValidation.founderOpportunity.featuresToAvoid is empty — no real high-complexity signal was matched, so nothing is deferred here rather than inventing a feature to avoid.",
  };

  return [phase1, phase2, phase3];
}

/* ========================================================================= */
/* Launch readiness criteria                                                */
/* ========================================================================= */

/** confidence="high" gap count at/above this -> an explicit "resolve the high-confidence gaps" launch criterion is added. */
const LAUNCH_CRITERIA_MIN_HIGH_CONFIDENCE_GAPS = 1;

function buildLaunchReadinessCriteria(params: {
  buildDifficultyTier: BuildDifficultyTier;
  highConfidenceGapCount: number;
  totalGapCount: number;
}): string[] {
  const { buildDifficultyTier, highConfidenceGapCount, totalGapCount } = params;
  const criteria: string[] = [];

  if (highConfidenceGapCount >= LAUNCH_CRITERIA_MIN_HIGH_CONFIDENCE_GAPS) {
    criteria.push(
      `Address the ${highConfidenceGapCount} high-confidence market gap(s) (of ${totalGapCount} total evidenced) before launch — these have the strongest evidence backing.`,
    );
  } else {
    criteria.push(
      `No high-confidence market gap was evidenced (0 of ${totalGapCount} total) — launch readiness cannot be gated on gap resolution here; validate demand directly with early adopters instead.`,
    );
  }

  if (buildDifficultyTier === "high") {
    criteria.push(`buildDifficulty.tier="high" — de-risk the highest-complexity signal(s) with a spike/prototype before committing to the full MVP scope.`);
  } else {
    criteria.push(`buildDifficulty.tier="${buildDifficultyTier}" — no additional de-risking spike is indicated by build-difficulty signals alone.`);
  }

  return criteria;
}

/* ========================================================================= */
/* Result shape + entry point                                               */
/* ========================================================================= */

export interface MvpScopeResult {
  /** Reused verbatim from `report.recommendedMvp`. */
  recommendedMvp: string;
  /** Reused verbatim from `report.estimatedTimeToMvp`. */
  estimatedTimeToMvp: string;
  /** Reused verbatim from `report.buildDifficulty.tier`. */
  buildDifficulty: BuildDifficultyTier;
  /** Reused verbatim from `report.buildDifficulty.explanation`. */
  buildDifficultyExplanation: string;
  /** Reused verbatim from `aiDecisionValidation.founderOpportunity.topMvpFeatures`. */
  coreFeatures: string[];
  /** Reused verbatim from `aiDecisionValidation.founderOpportunity.featuresToAvoid`. */
  featuresToAvoidAtLaunch: string[];
  featuresToAvoidReason: string;
  phasedRoadmap: MvpPhase[];
  launchReadinessCriteria: string[];
  scopeSummary: string;
}

/**
 * Generates the Phase 4 MVP scope bundle from an already-populated
 * `FounderOpportunityReport`. Pure function — no side effects, no LLM call,
 * no re-derivation of any upstream field. Standalone library (mirrors
 * `src/founder-copilot`'s pattern): not wired into engine.ts.
 */
export function generateMvpScope(report: FounderOpportunityReport): MvpScopeResult {
  const { buildDifficulty, recommendedMvp, estimatedTimeToMvp, aiDecisionValidation, founderIntelligence } = report;
  const { topMvpFeatures, featuresToAvoid } = aiDecisionValidation.founderOpportunity;
  const marketGaps = founderIntelligence.marketGaps;

  const marketGapDescriptions = marketGaps.map((gap) => `${gap.gap} (${gap.evidenceCount} evidence item(s), confidence=${gap.confidence})`);
  const highConfidenceGapCount = marketGaps.filter((gap) => gap.confidence === "high").length;

  const phasedRoadmap = buildPhasedRoadmap({
    topMvpFeatures,
    marketGapDescriptions,
    featuresToAvoid,
  });

  const launchReadinessCriteria = buildLaunchReadinessCriteria({
    buildDifficultyTier: buildDifficulty.tier,
    highConfidenceGapCount,
    totalGapCount: marketGaps.length,
  });

  const scopeSummary = `recommendedMvp="${recommendedMvp}" (estimatedTimeToMvp=${estimatedTimeToMvp}, buildDifficulty.tier="${buildDifficulty.tier}"). Core Phase 1 features: ${
    topMvpFeatures.length > 0 ? topMvpFeatures.join("; ") : "none evidenced"
  }.`;

  return {
    recommendedMvp,
    estimatedTimeToMvp,
    buildDifficulty: buildDifficulty.tier,
    buildDifficultyExplanation: buildDifficulty.explanation,
    coreFeatures: topMvpFeatures,
    featuresToAvoidAtLaunch: featuresToAvoid,
    featuresToAvoidReason:
      featuresToAvoid.length > 0
        ? `Reused verbatim from aiDecisionValidation.founderOpportunity.featuresToAvoid (buildDifficulty.matchedSignals: ${buildDifficulty.matchedSignals.join(", ") || "none"}).`
        : "buildDifficulty.matchedSignals is empty — no real high-complexity signal exists to avoid, so nothing is listed rather than invented.",
    phasedRoadmap,
    launchReadinessCriteria,
    scopeSummary,
  };
}
