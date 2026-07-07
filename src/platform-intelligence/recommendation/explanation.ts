import type { RecommendationFactor } from "./types.js";

/** Renders a human-readable explanation from a recommendation's contributing factors, strongest first. */
export function buildExplanation(factors: RecommendationFactor[]): string {
  if (factors.length === 0) return "No contributing factors were recorded for this recommendation.";
  const ordered = [...factors].sort((a, b) => b.weight - a.weight);
  const parts = ordered.map((factor) => `${factor.detail} (${factor.label}, weight ${factor.weight.toFixed(2)})`);
  return `Recommended because: ${parts.join("; ")}.`;
}
