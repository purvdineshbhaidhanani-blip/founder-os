import type { ClassifiedItem, ExtractedProblem, ProblemCategory } from "./types.js";

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
  other: "Uncategorized signal — no specific pattern matched.",
};

export function extractProblem(classifiedItem: ClassifiedItem, category: ProblemCategory): ExtractedProblem {
  return {
    classifiedItem,
    category,
    normalizedStatement: CANONICAL_STATEMENTS[category],
  };
}
