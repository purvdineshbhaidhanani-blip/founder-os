import { describe, expect, it } from "vitest";
import { computeSeverity, SEVERITY_WEIGHTS } from "../../src/problems/severity.js";
import type { ClassifiedItem, FrequencyStats } from "../../src/problems/types.js";
import type { RawResearchItem } from "../../src/research/types.js";

function makeItem(overrides: Partial<RawResearchItem> & { url: string }): RawResearchItem {
  return { title: "Untitled", sourceId: "src-a", ...overrides };
}

function classified(item: RawResearchItem, urgency: boolean, emotionalIntensityScore: number): ClassifiedItem {
  return { item, categories: [], urgency, emotionalIntensityScore };
}

function frequency(overrides: Partial<FrequencyStats> = {}): FrequencyStats {
  return {
    mentions: 0,
    uniqueAuthors: 0,
    uniqueSources: 0,
    engagementTotal: 0,
    growth: { label: "insufficient-data", recentHalfCount: 0, earlierHalfCount: 0, ratio: null },
    ...overrides,
  };
}

describe("SEVERITY_WEIGHTS", () => {
  it("sums to exactly 1.0", () => {
    const total = Object.values(SEVERITY_WEIGHTS).reduce((sum, w) => sum + w, 0);
    expect(total).toBeCloseTo(1.0, 10);
  });
});

describe("computeSeverity", () => {
  it("computes a fully-worked, real-numbers example for a pricing-complaint / Pricing Friction cluster", () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/1" }),
      makeItem({ url: "https://example.com/2" }),
      makeItem({ url: "https://example.com/3" }),
    ];
    const classifiedItems: ClassifiedItem[] = [
      classified(items[0]!, true, 0.8),
      classified(items[1]!, true, 0.3),
      classified(items[2]!, false, 0),
    ];
    const freq = frequency({
      mentions: 10,
      growth: { label: "rising", recentHalfCount: 8, earlierHalfCount: 2, ratio: 4 },
    });

    const result = computeSeverity({ category: "pricing-complaint", rootCause: "Pricing Friction", frequency: freq, classifiedItems });

    // frequency: min(1, 10/20)*100 = 50, +15 (rising) = 65
    expect(result.frequency).toBe(65);
    // urgency: 2/3 items urgent -> round(66.67) = 67
    expect(result.urgency).toBe(67);
    // businessImpact: base 40 + 30 (pricing-complaint is a high-impact category) + 30 (Pricing Friction is a high-impact rootCause) = 100
    expect(result.businessImpact).toBe(100);
    // timeCost/moneyCost: fixed lookup keyed by rootCause "Pricing Friction"
    expect(result.timeCost).toBe("low");
    expect(result.moneyCost).toBe("high");
    // emotionalFriction: avg(0.8, 0.3, 0) = 0.3667 -> round(36.67) = 37
    expect(result.emotionalFriction).toBe(37);
    // severity = round(65*0.3 + 67*0.25 + 100*0.3 + 37*0.15) = round(19.5 + 16.75 + 30 + 5.55) = round(71.8) = 72
    expect(result.severity).toBe(72);
    expect(result.severity).toBeGreaterThanOrEqual(0);
    expect(result.severity).toBeLessThanOrEqual(100);
    expect(result.reasons.length).toBeGreaterThanOrEqual(6);

    // eslint-disable-next-line no-console
    console.log(`[severity.ts real example] ${JSON.stringify({ severity: result.severity, ...result })}`);
  });

  it("developerFriction outweighs customerFriction for a bug-category cluster (documented split rule: bug weight 0.7 developer)", () => {
    const items: RawResearchItem[] = [makeItem({ url: "https://example.com/b1" }), makeItem({ url: "https://example.com/b2" })];
    const classifiedItems: ClassifiedItem[] = [classified(items[0]!, false, 0.5), classified(items[1]!, false, 0.5)];
    const freq = frequency({ mentions: 4 });

    const result = computeSeverity({ category: "bug", rootCause: "Reliability/Bugs", frequency: freq, classifiedItems });
    expect(result.developerFriction).toBeGreaterThan(result.customerFriction);
  });

  it("customerFriction outweighs developerFriction for a pricing-complaint cluster (documented split rule: pricing weight 0.2 developer)", () => {
    const items: RawResearchItem[] = [makeItem({ url: "https://example.com/p1" }), makeItem({ url: "https://example.com/p2" })];
    const classifiedItems: ClassifiedItem[] = [classified(items[0]!, false, 0.5), classified(items[1]!, false, 0.5)];
    const freq = frequency({ mentions: 4 });

    const result = computeSeverity({ category: "pricing-complaint", rootCause: "Pricing Friction", frequency: freq, classifiedItems });
    expect(result.customerFriction).toBeGreaterThan(result.developerFriction);
  });

  it("Manual Process rootCause -> high timeCost, low moneyCost (mission's own example)", () => {
    const items: RawResearchItem[] = [makeItem({ url: "https://example.com/m1" })];
    const classifiedItems: ClassifiedItem[] = [classified(items[0]!, false, 0)];
    const result = computeSeverity({ category: "workflow-friction", rootCause: "Manual Process", frequency: frequency(), classifiedItems });
    expect(result.timeCost).toBe("high");
    expect(result.moneyCost).toBe("low");
  });

  it("defaults timeCost/moneyCost to 'low' and urgency/emotionalFriction to 0 when there is no rootCause and no items", () => {
    const result = computeSeverity({ category: "complaint", frequency: frequency(), classifiedItems: [] });
    expect(result.timeCost).toBe("low");
    expect(result.moneyCost).toBe("low");
    expect(result.urgency).toBe(0);
    expect(result.emotionalFriction).toBe(0);
    expect(result.severity).toBeGreaterThanOrEqual(0);
    expect(result.severity).toBeLessThanOrEqual(100);
  });

  it("frequency sub-score is penalized for declining growth", () => {
    const risingFreq = frequency({ mentions: 10, growth: { label: "rising", recentHalfCount: 8, earlierHalfCount: 2, ratio: 4 } });
    const decliningFreq = frequency({ mentions: 10, growth: { label: "declining", recentHalfCount: 2, earlierHalfCount: 8, ratio: 0.25 } });
    const rising = computeSeverity({ category: "bug", frequency: risingFreq, classifiedItems: [] });
    const declining = computeSeverity({ category: "bug", frequency: decliningFreq, classifiedItems: [] });
    expect(rising.frequency).toBeGreaterThan(declining.frequency);
  });
});
