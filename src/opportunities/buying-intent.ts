import type { ClassifiedItem } from "../problems/types.js";
import type { BuyingIntentResult } from "./types.js";

/**
 * Scores how much of a cluster's evidence carries an explicit buying-intent
 * signal (per src/problems/detector.ts's "buying-intent" category), e.g.
 * "willing to pay", "would pay for". Deterministic ratio, no LLM call.
 */
export function computeBuyingIntentScore(clusterItems: ClassifiedItem[]): BuyingIntentResult {
  const totalItemCount = clusterItems.length;
  const matchingItemCount = clusterItems.filter((classified) =>
    classified.categories.some((match) => match.category === "buying-intent"),
  ).length;

  const score = totalItemCount === 0 ? 0 : matchingItemCount / totalItemCount;

  return {
    score,
    matchingItemCount,
    totalItemCount,
    explanation: `${matchingItemCount} of ${totalItemCount} items show buying-intent signal (score ${score.toFixed(2)}).`,
  };
}
