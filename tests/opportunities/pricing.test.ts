import { describe, expect, it } from "vitest";
import { extractPricingSignal } from "../../src/opportunities/pricing.js";
import type { RawResearchItem } from "../../src/research/types.js";

function makeItem(overrides: Partial<RawResearchItem> & { url: string; title: string }): RawResearchItem {
  return { sourceId: "src", ...overrides };
}

describe("extractPricingSignal", () => {
  it("returns a no-data message when no prices are mentioned", () => {
    const items: RawResearchItem[] = [makeItem({ url: "u1", title: "No pricing mentioned here" })];
    const result = extractPricingSignal(items);
    expect(result.extractedPrices).toEqual([]);
    expect(result.suggestedPriceText).toBe(
      "No price data mentioned in evidence — pricing requires primary research before launch.",
    );
  });

  it("extracts, dedupes, and sorts prices ascending, suggesting 20% below the lowest", () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "u1", title: "This costs $50 a month" }),
      makeItem({ url: "u2", title: "I've seen it for $50 and also $20 elsewhere", body: "Another mention of $99.99" }),
    ];
    const result = extractPricingSignal(items);
    expect(result.extractedPrices).toEqual([20, 50, 99.99]);
    // lowest = 20, suggestion = floor(20 * 0.8) = 16
    expect(result.suggestedPriceText).toContain("$20");
    expect(result.suggestedPriceText).toContain("$16");
    expect(result.suggestedPriceText).toContain("evidence-derived, not a market-validated price");
  });

  it("filters out prices outside the reasonable SaaS range (1 to 10000)", () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "u1", title: "Someone paid $0.50 for a candy bar, unrelated to this $19999999 claim" }),
      makeItem({ url: "u2", title: "The real price is $29" }),
    ];
    const result = extractPricingSignal(items);
    expect(result.extractedPrices).toEqual([29]);
  });
});
