import { describe, expect, it } from "vitest";
import { extractProblem } from "../../src/problems/extractor.js";
import type { ClassifiedItem, ProblemCategory } from "../../src/problems/types.js";
import type { RawResearchItem } from "../../src/research/types.js";

const item: RawResearchItem = { title: "t", url: "https://example.com/x", sourceId: "test" };
const classifiedItem: ClassifiedItem = { item, categories: [] };

const EXPECTED: Record<ProblemCategory, string> = {
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

describe("extractProblem", () => {
  for (const [category, statement] of Object.entries(EXPECTED) as Array<[ProblemCategory, string]>) {
    it(`maps ${category} to its exact fixed canonical statement`, () => {
      const extracted = extractProblem(classifiedItem, category);
      expect(extracted.normalizedStatement).toBe(statement);
      expect(extracted.category).toBe(category);
      expect(extracted.classifiedItem).toBe(classifiedItem);
    });
  }
});
