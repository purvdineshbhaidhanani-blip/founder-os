import { RealityGuard } from "../intelligence/reality-guard.js";
import type { Insight, Confidence } from "../intelligence/types.js";

const guard = new RealityGuard();

const CONFIDENCE_NUMERIC: Record<Confidence, number> = {
  low: 0.33,
  medium: 0.66,
  high: 1,
};

function numericToBand(score: number): Confidence {
  if (score >= CONFIDENCE_NUMERIC.high) return "high";
  if (score >= CONFIDENCE_NUMERIC.medium) return "medium";
  return "low";
}

/**
 * Computes the research engine's confidence for a session's report by
 * delegating the core recalibration to `RealityGuard.recalibrate` (source
 * diversity downgrade logic already lives there — this module never
 * reimplements it) and then discounting the result by source coverage
 * (how many eligible sources actually contributed vs. how many could have).
 */
export function computeResearchConfidence(
  sourcesUsedCount: number,
  sourcesEligibleCount: number,
  insight: Insight<unknown>,
): { band: "low" | "medium" | "high"; numericScore: number } {
  const recalibrated = guard.recalibrate(insight);
  const baseScore = CONFIDENCE_NUMERIC[recalibrated.confidence];

  const coverageRatio = sourcesEligibleCount > 0 ? Math.min(1, sourcesUsedCount / sourcesEligibleCount) : 0;

  const numericScore = Math.round(baseScore * coverageRatio * 100) / 100;
  return { band: numericToBand(numericScore), numericScore };
}
