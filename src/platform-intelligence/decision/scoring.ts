import { clampConfidence } from "../shared/confidence.js";
import type { DecisionFactor } from "./types.js";

/** Weighted average of every factor's score (0-1), normalized by total weight. The single scoring formula the Decision Engine uses. */
export function weightedScore(factors: DecisionFactor[]): number {
  const totalWeight = factors.reduce((sum, f) => sum + Math.max(0, f.weight), 0);
  if (totalWeight === 0) return 0;
  const weightedSum = factors.reduce((sum, f) => sum + Math.max(0, f.weight) * clampConfidence(f.score), 0);
  return clampConfidence(weightedSum / totalWeight);
}
