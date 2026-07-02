import type { ClassifiedItem, ProblemCategory } from "../problems/types.js";
import type { BuyingIntentResult } from "./types.js";

/**
 * Categories that carry a real, but IMPLICIT, purchase-intent signal even
 * without an explicit buying-intent phrase match: a pricing complaint means
 * someone is already paying (or would, at the right price); a migration
 * means someone actively moved budget from one tool to another; existing
 * spending means real budget is already allocated; looking-for-alternative
 * means someone is actively shopping for a paid replacement. Added per the
 * Loop 4 mandate — previously these items scored 0 buying-intent credit.
 */
const IMPLICIT_BUYING_INTENT_CATEGORIES: ProblemCategory[] = [
  "pricing-complaint",
  "migration",
  "existing-spending",
  "looking-for-alternative",
];

/**
 * Partial weight given to an implicit-only match, relative to a full 1.0
 * weight for an explicit "buying-intent" phrase match. Fixed at 0.4 (not
 * higher) because these categories are corroborating evidence of budget or
 * intent, not a direct statement of willingness to pay: 0.4 means 2.5
 * implicit-only items are needed to equal the weight of 1 explicit item,
 * so implicit signal can meaningfully lift a score above 0 without ever
 * being treated as strong as an explicit "I'd pay for this" statement. This
 * keeps the score a simple, auditable linear weighted average, matching
 * every other formula in src/opportunities (see scoring.ts).
 */
const IMPLICIT_MATCH_WEIGHT = 0.4;

function isExplicitBuyingIntentMatch(classified: ClassifiedItem): boolean {
  return classified.categories.some((match) => match.category === "buying-intent");
}

function isImplicitBuyingIntentMatch(classified: ClassifiedItem): boolean {
  return classified.categories.some((match) =>
    IMPLICIT_BUYING_INTENT_CATEGORIES.includes(match.category),
  );
}

/**
 * Scores how much of a cluster's evidence carries a buying-intent signal.
 * An item scores full weight (1.0) if it carries an EXPLICIT buying-intent
 * phrase match (per src/problems/detector.ts's "buying-intent" category,
 * e.g. "willing to pay", "would pay for"). An item that does not match
 * explicitly but falls into one of the IMPLICIT_BUYING_INTENT_CATEGORIES
 * scores a PARTIAL weight (IMPLICIT_MATCH_WEIGHT) instead of 0. Every item
 * is counted at most once, at its highest-applicable weight (explicit takes
 * priority over implicit). Deterministic weighted average, no LLM call.
 */
export function computeBuyingIntentScore(clusterItems: ClassifiedItem[]): BuyingIntentResult {
  const totalItemCount = clusterItems.length;

  let explicitCount = 0;
  let implicitCount = 0;

  for (const classified of clusterItems) {
    if (isExplicitBuyingIntentMatch(classified)) {
      explicitCount += 1;
    } else if (isImplicitBuyingIntentMatch(classified)) {
      implicitCount += 1;
    }
  }

  const matchingItemCount = explicitCount + implicitCount;
  const weightedSum = explicitCount * 1 + implicitCount * IMPLICIT_MATCH_WEIGHT;
  const score = totalItemCount === 0 ? 0 : Math.min(1, weightedSum / totalItemCount);

  return {
    score,
    matchingItemCount,
    totalItemCount,
    explanation:
      `${explicitCount} of ${totalItemCount} items show explicit buying-intent signal (weight 1.0), ` +
      `${implicitCount} of ${totalItemCount} show implicit purchase-intent signal via pricing-complaint/` +
      `migration/existing-spending/looking-for-alternative (weight ${IMPLICIT_MATCH_WEIGHT}) ` +
      `-> score ${score.toFixed(2)}.`,
  };
}
