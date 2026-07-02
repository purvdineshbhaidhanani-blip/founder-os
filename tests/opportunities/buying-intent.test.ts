import { describe, expect, it } from "vitest";
import { computeBuyingIntentScore } from "../../src/opportunities/buying-intent.js";
import type { ClassifiedItem, RawResearchItem } from "../../src/problems/types.js";

function makeItem(url: string): RawResearchItem {
  return { title: "t", url, sourceId: "src" };
}

function classified(url: string, categories: ClassifiedItem["categories"]): ClassifiedItem {
  return { item: makeItem(url), categories };
}

describe("computeBuyingIntentScore", () => {
  it("returns 0 score and zero counts for an empty item list", () => {
    const result = computeBuyingIntentScore([]);
    expect(result.score).toBe(0);
    expect(result.matchingItemCount).toBe(0);
    expect(result.totalItemCount).toBe(0);
  });

  it("computes the ratio of buying-intent-matching items", () => {
    const items: ClassifiedItem[] = [
      classified("u1", [{ category: "buying-intent", confidence: 0.8, matchedPatterns: ["would pay for"] }]),
      classified("u2", [{ category: "complaint", confidence: 0.3, matchedPatterns: ["hate"] }]),
      classified("u3", [{ category: "buying-intent", confidence: 0.3, matchedPatterns: ["looking to buy"] }]),
      classified("u4", [{ category: "other", confidence: 0.2, matchedPatterns: [] }]),
    ];

    const result = computeBuyingIntentScore(items);
    expect(result.matchingItemCount).toBe(2);
    expect(result.totalItemCount).toBe(4);
    expect(result.score).toBeCloseTo(0.5, 5);
    expect(result.explanation).toBe("2 of 4 items show buying-intent signal (score 0.50).");
  });

  it("counts an item once even if it matches buying-intent alongside other categories", () => {
    const items: ClassifiedItem[] = [
      classified("u1", [
        { category: "complaint", confidence: 0.3, matchedPatterns: ["hate"] },
        { category: "buying-intent", confidence: 0.8, matchedPatterns: ["would pay for"] },
      ]),
    ];
    const result = computeBuyingIntentScore(items);
    expect(result.matchingItemCount).toBe(1);
    expect(result.score).toBe(1);
  });
});
