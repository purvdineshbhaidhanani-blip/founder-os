import { pickDominantConcept } from "./concept.js";
import type { ClassifiedItem, ExtractedProblem, ProblemCategory } from "./types.js";
import type { RawResearchItem } from "../research/types.js";

/**
 * Fixed canonical statements per category — never free-form generated, so
 * downstream consumers can rely on exact string matching / i18n lookup.
 */
const CANONICAL_STATEMENTS: Record<ProblemCategory, string> = {
  complaint: "Users express general dissatisfaction.",
  "feature-request": "Users are requesting a new feature.",
  bug: "Users are encountering functional bugs or errors.",
  "missing-capability": "Users report the product lacks a needed capability.",
  "workflow-friction": "Users find the current workflow tedious or confusing.",
  "pricing-complaint": "Users believe pricing is too expensive.",
  migration: "Users are switching away from the product or category.",
  "looking-for-alternative": "Users are actively seeking an alternative.",
  "buying-intent": "Users express willingness to pay for a solution.",
  praise: "Users express satisfaction or praise.",
  trend: "This topic is showing rising mention volume.",
  "market-gap": "Users report no existing solution for this problem.",
  workaround: "Users have built manual workarounds because no product solves this — often a stronger signal than a complaint.",
  "existing-spending": "Users are already paying for a related solution, demonstrating real budget exists.",
  other: "Uncategorized signal — no specific pattern matched.",
};

export function extractProblem(classifiedItem: ClassifiedItem, category: ProblemCategory): ExtractedProblem {
  return {
    classifiedItem,
    category,
    normalizedStatement: CANONICAL_STATEMENTS[category],
  };
}

export interface ConceptAwareExtraction {
  normalizedStatement: string;
  /** Present only when a dominant concept group (concept.ts) was found across the category's items. */
  rootCause?: string;
  /** Intra-category concept breakdown — see concept.ts's `pickDominantConcept` doc. Empty array when no item matched any concept group. */
  conceptBreakdown: Array<{ conceptId: string; canonicalStatement: string; rootCause: string; count: number }>;
}

/**
 * Composition layer (Loop 5, Part 2/6): decorates the existing, fixed,
 * category-level `extractProblem` statement with a richer, sub-concept-aware
 * statement/root-cause WHEN one of `concept.ts`'s fixed concept groups
 * matches at least one item in `categoryItems`. `categoryItems` is expected
 * to be every raw item classified into `category` for this cluster (not
 * just the first one) — the whole point of this function is to look at ALL
 * of a category's items rather than only `classifiedItems[0]`, while still
 * producing exactly ONE normalized statement per category (see the hard
 * one-cluster-per-category constraint documented in engine.ts).
 *
 * SAFE FALLBACK: when no concept group matches ANY item, this falls back to
 * `extractProblem`'s fixed category-level canonical statement, so no
 * document/category is ever left without SOME normalized statement.
 */
export function extractProblemWithConcepts(
  classifiedItem: ClassifiedItem,
  categoryItems: RawResearchItem[],
  category: ProblemCategory,
): ConceptAwareExtraction {
  const { dominant, breakdown } = pickDominantConcept(categoryItems, category);

  if (dominant) {
    return {
      normalizedStatement: dominant.canonicalStatement,
      rootCause: dominant.rootCause,
      conceptBreakdown: breakdown,
    };
  }

  const fallback = extractProblem(classifiedItem, category);
  return { normalizedStatement: fallback.normalizedStatement, conceptBreakdown: breakdown };
}
