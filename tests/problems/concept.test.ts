import { describe, expect, it } from "vitest";
import { CONCEPT_GROUPS, extractConcept, pickDominantConcept } from "../../src/problems/concept.js";
import type { RawResearchItem } from "../../src/research/types.js";
import type { ProblemCategory } from "../../src/problems/types.js";

function makeItem(overrides: Partial<RawResearchItem> & { url: string }): RawResearchItem {
  return { title: "Untitled", sourceId: "src-a", ...overrides };
}

describe("CONCEPT_GROUPS", () => {
  it("has ~20 fixed groups, each with a valid category and a non-empty trigger list", () => {
    expect(CONCEPT_GROUPS.length).toBeGreaterThanOrEqual(18);
    expect(CONCEPT_GROUPS.length).toBeLessThanOrEqual(22);
    for (const group of CONCEPT_GROUPS) {
      expect(group.triggerPhrases.length).toBeGreaterThan(0);
      expect(group.canonicalStatement.length).toBeGreaterThan(0);
      expect(group.rootCause.length).toBeGreaterThan(0);
    }
  });

  it("every group id is unique", () => {
    const ids = CONCEPT_GROUPS.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("spans every founder-actionable ProblemCategory except praise/trend/other", () => {
    const categories = new Set(CONCEPT_GROUPS.map((g) => g.category));
    const expected: ProblemCategory[] = [
      "complaint",
      "feature-request",
      "bug",
      "missing-capability",
      "workflow-friction",
      "pricing-complaint",
      "migration",
      "looking-for-alternative",
      "buying-intent",
      "market-gap",
      "workaround",
      "existing-spending",
    ];
    for (const category of expected) {
      expect(categories.has(category)).toBe(true);
    }
    expect(categories.has("praise")).toBe(false);
    expect(categories.has("trend")).toBe(false);
    expect(categories.has("other")).toBe(false);
  });
});

describe("extractConcept", () => {
  it("the mission's own example: 'too expensive' pricing-complaint text resolves to automation-too-expensive", () => {
    const item = makeItem({ url: "https://example.com/1", title: "Zapier is too expensive for what it does" });
    const result = extractConcept(item, "pricing-complaint");
    expect(result).toEqual({
      conceptId: "automation-too-expensive",
      canonicalStatement: "Automation/tooling pricing is too expensive for the value delivered.",
      rootCause: "Pricing Friction",
    });
  });

  it("matches missing-integration in feature-request per the mission's exact example phrasing", () => {
    const item = makeItem({ url: "https://example.com/2", title: "This doesn't integrate with our CRM at all" });
    const result = extractConcept(item, "feature-request");
    expect(result?.conceptId).toBe("missing-integration");
    expect(result?.rootCause).toBe("Missing Integration");
  });

  it("matches poor-ux-hard-to-learn in complaint per the mission's exact example phrasing", () => {
    const item = makeItem({ url: "https://example.com/3", title: "This has a steep learning curve and is hard to use" });
    const result = extractConcept(item, "complaint");
    expect(result?.conceptId).toBe("poor-ux-hard-to-learn");
    expect(result?.rootCause).toBe("Poor UX");
  });

  it("matches unreliable-buggy in bug per the mission's exact example phrasing", () => {
    const item = makeItem({ url: "https://example.com/4", title: "This app keeps crashing, so unreliable" });
    const result = extractConcept(item, "bug");
    expect(result?.conceptId).toBe("unreliable-buggy");
    expect(result?.rootCause).toBe("Reliability/Bugs");
  });

  it("matches time-consuming-manual-work in workflow-friction per the mission's exact example phrasing", () => {
    const item = makeItem({ url: "https://example.com/5", title: "This takes forever, I spend hours on manual work" });
    const result = extractConcept(item, "workflow-friction");
    expect(result?.conceptId).toBe("time-consuming-manual-work");
    expect(result?.rootCause).toBe("Manual Process");
  });

  it("returns null (safe fallback) when no concept group's trigger phrase matches", () => {
    const item = makeItem({ url: "https://example.com/6", title: "Completely unrelated text about the weather" });
    expect(extractConcept(item, "complaint")).toBeNull();
  });

  it("returns null for a category with no registered concept groups (praise)", () => {
    const item = makeItem({ url: "https://example.com/7", title: "I love this, amazing product" });
    expect(extractConcept(item, "praise")).toBeNull();
  });

  it("only matches groups registered for the requested category, not other categories' groups", () => {
    // "too expensive" is a pricing-complaint trigger; asking for "complaint" must not match it.
    const item = makeItem({ url: "https://example.com/8", title: "This is too expensive" });
    expect(extractConcept(item, "complaint")).toBeNull();
  });
});

describe("pickDominantConcept — the mission's Zapier example (evidence count 3, one concept)", () => {
  it("'Zapier expensive' / 'can't afford Zapier' / 'automation costs too much' all resolve to ONE concept with count 3", () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/z1", title: "Zapier is too expensive for a small team like ours" }),
      makeItem({ url: "https://example.com/z2", title: "I can't afford Zapier anymore, cancelling my plan" }),
      makeItem({ url: "https://example.com/z3", title: "Honestly automation costs too much for what it delivers" }),
    ];

    const { dominant, breakdown } = pickDominantConcept(items, "pricing-complaint");

    expect(dominant).toEqual({
      conceptId: "automation-too-expensive",
      canonicalStatement: "Automation/tooling pricing is too expensive for the value delivered.",
      rootCause: "Pricing Friction",
      count: 3,
    });
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0]!.count).toBe(3);

    // eslint-disable-next-line no-console
    console.log(
      `[concept.ts Zapier example] dominant concept "${dominant!.conceptId}" (${dominant!.canonicalStatement}), evidence count=${dominant!.count}, rootCause="${dominant!.rootCause}"`,
    );
  });
});

describe("pickDominantConcept — mixed-concept breakdown and tie-break", () => {
  it("tallies multiple distinct concepts within one category and picks the highest count as dominant", () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/1", title: "Willing to pay for a fix" }), // ready-to-pay
      makeItem({ url: "https://example.com/2", title: "Would pay for this immediately" }), // ready-to-pay
      makeItem({ url: "https://example.com/3", title: "Take my money, shut up and take my money" }), // ready-to-pay
      makeItem({ url: "https://example.com/4", title: "This is unrelated filler text with no concept match" }), // no match
    ];

    const { dominant, breakdown } = pickDominantConcept(items, "buying-intent");
    expect(dominant?.conceptId).toBe("ready-to-pay");
    expect(dominant?.count).toBe(3);
    // The unmatched 4th item contributes nothing to the breakdown.
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0]!.count).toBe(3);
  });

  it("breaks ties by FIRST-ENCOUNTERED concept id, per its documented tie-break rule", () => {
    // Both concept groups get exactly 1 match each; "poor-ux-hard-to-learn"
    // group is listed BEFORE "general-frustration" in CONCEPT_GROUPS, but
    // here "general-frustration" is matched by the item appearing FIRST in
    // the input array, so it should win the tie.
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/1", title: "Terrible, just terrible" }), // general-frustration
      makeItem({ url: "https://example.com/2", title: "Hard to learn, very confusing interface" }), // poor-ux-hard-to-learn
    ];

    const { dominant } = pickDominantConcept(items, "complaint");
    expect(dominant?.conceptId).toBe("general-frustration");
    expect(dominant?.count).toBe(1);
  });

  it("returns dominant=null and an empty breakdown when no item matches any concept group", () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/1", title: "I love this, amazing product" }),
      makeItem({ url: "https://example.com/2", title: "Best tool I've used, great job" }),
    ];
    const { dominant, breakdown } = pickDominantConcept(items, "praise");
    expect(dominant).toBeNull();
    expect(breakdown).toEqual([]);
  });

  it("returns dominant=null and an empty breakdown for an empty item list", () => {
    const { dominant, breakdown } = pickDominantConcept([], "complaint");
    expect(dominant).toBeNull();
    expect(breakdown).toEqual([]);
  });
});
