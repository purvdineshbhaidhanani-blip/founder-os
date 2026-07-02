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

  it("computes the ratio of explicit buying-intent-matching items (no regression from the pre-Loop-4 behavior)", () => {
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
    expect(result.explanation).toContain("2 of 4 items show explicit buying-intent signal");
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

  it("gives zero credit to items with no explicit or implicit buying-intent signal", () => {
    const items: ClassifiedItem[] = [
      classified("u1", [{ category: "complaint", confidence: 0.3, matchedPatterns: ["hate"] }]),
      classified("u2", [{ category: "praise", confidence: 0.3, matchedPatterns: ["love "] }]),
    ];
    const result = computeBuyingIntentScore(items);
    expect(result.score).toBe(0);
    expect(result.matchingItemCount).toBe(0);
  });

  it("gives PARTIAL credit to implicit-only categories (pricing-complaint, migration, existing-spending, looking-for-alternative) that previously scored 0", () => {
    const items: ClassifiedItem[] = [
      classified("u1", [{ category: "pricing-complaint", confidence: 0.3, matchedPatterns: ["too expensive"] }]),
      classified("u2", [{ category: "migration", confidence: 0.3, matchedPatterns: ["switched from"] }]),
      classified("u3", [{ category: "existing-spending", confidence: 0.3, matchedPatterns: ["we already pay"] }]),
      classified("u4", [{ category: "looking-for-alternative", confidence: 0.3, matchedPatterns: ["alternative to"] }]),
    ];
    const result = computeBuyingIntentScore(items);

    // Before this change, none of these categories were "buying-intent", so
    // score would have been 0. Now each counts at the 0.4 implicit weight:
    // (0.4 * 4) / 4 = 0.4.
    expect(result.score).toBeCloseTo(0.4, 5);
    expect(result.matchingItemCount).toBe(4);
    expect(result.explanation).toContain("0 of 4 items show explicit buying-intent signal");
    expect(result.explanation).toContain("4 of 4 show implicit purchase-intent signal");
  });

  it("mixed explicit+implicit evidence scores higher than either single-signal item alone, with explicit weighted more heavily per item", () => {
    const explicitOnly = computeBuyingIntentScore([
      classified("u1", [{ category: "buying-intent", confidence: 0.8, matchedPatterns: ["would pay for"] }]),
      classified("u2", [{ category: "complaint", confidence: 0.3, matchedPatterns: ["hate"] }]),
    ]);
    const implicitOnly = computeBuyingIntentScore([
      classified("u1", [{ category: "pricing-complaint", confidence: 0.3, matchedPatterns: ["too expensive"] }]),
      classified("u2", [{ category: "complaint", confidence: 0.3, matchedPatterns: ["hate"] }]),
    ]);
    const mixed = computeBuyingIntentScore([
      classified("u1", [{ category: "buying-intent", confidence: 0.8, matchedPatterns: ["would pay for"] }]),
      classified("u2", [{ category: "pricing-complaint", confidence: 0.3, matchedPatterns: ["too expensive"] }]),
    ]);

    expect(explicitOnly.score).toBeCloseTo(0.5, 5); // 1 explicit / 2 items
    expect(implicitOnly.score).toBeCloseTo(0.2, 5); // 1 implicit * 0.4 / 2 items
    expect(mixed.score).toBeCloseTo(0.7, 5); // (1*1.0 + 1*0.4) / 2, both items now contribute

    // both signal types contribute in the mixed case, so it outscores either
    // single-contributor case, and the per-item explicit weight (1.0) still
    // dominates the implicit weight (0.4) in the underlying formula.
    expect(mixed.score).toBeGreaterThan(explicitOnly.score);
    expect(mixed.score).toBeGreaterThan(implicitOnly.score);
  });

  it("prioritizes the explicit weight when an item matches both an explicit and an implicit category", () => {
    const items: ClassifiedItem[] = [
      classified("u1", [
        { category: "buying-intent", confidence: 0.8, matchedPatterns: ["would pay for"] },
        { category: "pricing-complaint", confidence: 0.3, matchedPatterns: ["too expensive"] },
      ]),
    ];
    const result = computeBuyingIntentScore(items);
    expect(result.score).toBe(1); // full explicit weight, not double-counted or diluted by the implicit match
    expect(result.matchingItemCount).toBe(1);
  });
});
