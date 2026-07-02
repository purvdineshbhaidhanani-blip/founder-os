import { describe, expect, it } from "vitest";
import { classifyItem } from "../../src/problems/detector.js";
import type { RawResearchItem } from "../../src/research/types.js";

function makeItem(title: string, body?: string): RawResearchItem {
  return { title, body, url: `https://example.com/${encodeURIComponent(title)}`, sourceId: "test" };
}

function categoriesOf(item: RawResearchItem) {
  return classifyItem(item).categories;
}

describe("classifyItem", () => {
  it("matches complaint with confidence tier for a single pattern", () => {
    const result = categoriesOf(makeItem("This app is so annoying to use"));
    const match = result.find((c) => c.category === "complaint");
    expect(match).toBeDefined();
    expect(match?.confidence).toBe(0.3);
    expect(match?.matchedPatterns).toEqual(["annoying"]);
  });

  it("matches feature-request", () => {
    const result = categoriesOf(makeItem("Please add dark mode, feature request for the team"));
    const match = result.find((c) => c.category === "feature-request");
    expect(match).toBeDefined();
    expect(match?.matchedPatterns).toContain("please add");
    expect(match?.matchedPatterns).toContain("feature request");
    expect(match?.confidence).toBe(0.55);
  });

  it("matches bug", () => {
    const result = categoriesOf(makeItem("App keeps crash", "the export feature is broken"));
    const match = result.find((c) => c.category === "bug");
    expect(match).toBeDefined();
    expect(match?.matchedPatterns).toEqual(expect.arrayContaining(["crash", "broken"]));
  });

  it("matches missing-capability", () => {
    const result = categoriesOf(makeItem("This tool doesn't support CSV export"));
    const match = result.find((c) => c.category === "missing-capability");
    expect(match).toBeDefined();
    expect(match?.confidence).toBe(0.3);
  });

  it("matches workflow-friction", () => {
    const result = categoriesOf(makeItem("Onboarding is tedious and clunky, so many steps"));
    const match = result.find((c) => c.category === "workflow-friction");
    expect(match).toBeDefined();
    expect(match?.confidence).toBe(0.8);
  });

  it("matches pricing-complaint", () => {
    const result = categoriesOf(makeItem("Honestly it's too expensive for what you get"));
    const match = result.find((c) => c.category === "pricing-complaint");
    expect(match).toBeDefined();
    expect(match?.confidence).toBe(0.3);
  });

  it("matches migration", () => {
    const result = categoriesOf(makeItem("We switched from Notion to this last month"));
    const match = result.find((c) => c.category === "migration");
    expect(match).toBeDefined();
    expect(match?.matchedPatterns).toEqual(["switched from"]);
  });

  it("matches looking-for-alternative", () => {
    const result = categoriesOf(makeItem("Looking for alternative to this SaaS, any recommendations for a cheaper option"));
    const match = result.find((c) => c.category === "looking-for-alternative");
    expect(match).toBeDefined();
    expect(match?.confidence).toBe(0.8);
  });

  it("matches buying-intent", () => {
    const result = categoriesOf(makeItem("I would pay for this right now, willing to pay a lot"));
    const match = result.find((c) => c.category === "buying-intent");
    expect(match).toBeDefined();
    expect(match?.confidence).toBe(0.55);
  });

  it("matches praise", () => {
    const result = categoriesOf(makeItem("I love this tool, amazing work, great job team"));
    const match = result.find((c) => c.category === "praise");
    expect(match).toBeDefined();
    expect(match?.confidence).toBe(0.8);
    expect(match?.matchedPatterns).toEqual(expect.arrayContaining(["love ", "amazing", "great job"]));
  });

  it("supports a single item matching multiple categories", () => {
    const item = makeItem("It's too expensive and it's broken, please add a fix soon");
    const result = categoriesOf(item);
    const categories = result.map((c) => c.category);
    expect(categories).toEqual(expect.arrayContaining(["pricing-complaint", "bug", "feature-request"]));
  });

  it("falls back to other with confidence 0.2 when zero categories match", () => {
    const result = categoriesOf(makeItem("Quarterly earnings report published today"));
    expect(result).toEqual([{ category: "other", confidence: 0.2, matchedPatterns: [] }]);
  });
});
