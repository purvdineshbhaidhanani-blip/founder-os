import { describe, expect, it } from "vitest";
import { extractProblem, extractProblemWithConcepts } from "../../src/problems/extractor.js";
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
  "market-gap": "Users report no existing solution for this problem.",
  workaround:
    "Users have built manual workarounds because no product solves this — often a stronger signal than a complaint.",
  "existing-spending": "Users are already paying for a related solution, demonstrating real budget exists.",
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

describe("extractProblemWithConcepts", () => {
  it("uses the dominant concept's canonical statement + rootCause when a concept group matches", () => {
    const categoryItems: RawResearchItem[] = [
      { title: "Zapier is too expensive for what it does", url: "https://example.com/1", sourceId: "reddit" },
      { title: "I can't afford Zapier anymore", url: "https://example.com/2", sourceId: "hackernews" },
    ];
    const result = extractProblemWithConcepts(classifiedItem, categoryItems, "pricing-complaint");

    expect(result.normalizedStatement).toBe("Automation/tooling pricing is too expensive for the value delivered.");
    expect(result.rootCause).toBe("Pricing Friction");
    expect(result.conceptBreakdown).toEqual([
      {
        conceptId: "automation-too-expensive",
        canonicalStatement: "Automation/tooling pricing is too expensive for the value delivered.",
        rootCause: "Pricing Friction",
        count: 2,
      },
    ]);
  });

  it("falls back to extractProblem's fixed category-level statement when no concept group matches", () => {
    const categoryItems: RawResearchItem[] = [
      { title: "I love this, amazing product", url: "https://example.com/1", sourceId: "reddit" },
    ];
    const result = extractProblemWithConcepts(classifiedItem, categoryItems, "praise");

    expect(result.normalizedStatement).toBe("Users express satisfaction or praise.");
    expect(result.rootCause).toBeUndefined();
    expect(result.conceptBreakdown).toEqual([]);
  });

  it("falls back safely even for a category WITH registered concept groups when none match this item set", () => {
    const categoryItems: RawResearchItem[] = [
      { title: "Something unrelated entirely", url: "https://example.com/1", sourceId: "reddit" },
    ];
    const result = extractProblemWithConcepts(classifiedItem, categoryItems, "complaint");

    expect(result.normalizedStatement).toBe("Users express general dissatisfaction.");
    expect(result.rootCause).toBeUndefined();
    expect(result.conceptBreakdown).toEqual([]);
  });
});
