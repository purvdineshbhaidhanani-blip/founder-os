import { describe, expect, it } from "vitest";
import { flattenSessionItems, groupByCategory } from "../../src/problems/clustering.js";
import type { RawResearchItem } from "../../src/research/types.js";
import type { FounderReport, Opportunity, ResearchSession } from "../../src/research/types.js";

function makeItem(overrides: Partial<RawResearchItem> & { url: string }): RawResearchItem {
  return {
    title: "Untitled",
    sourceId: "test-source",
    ...overrides,
  };
}

function makeReport(opportunities: Opportunity[]): FounderReport {
  return {
    topOpportunities: opportunities,
    evidence: [],
    confidenceScore: { band: "low", numericScore: 0 },
    sourceCoverage: { used: [], failed: [], skipped: [], ratio: 0 },
    generatedAt: new Date().toISOString(),
  };
}

function makeSession(opportunities: Opportunity[]): ResearchSession {
  return {
    id: "research_fixture",
    windowDays: 30,
    startedAt: new Date().toISOString(),
    sourcesUsed: [],
    sourcesFailed: [],
    sourcesSkipped: [],
    opportunities,
    report: makeReport(opportunities),
    totalItemsCollected: opportunities.flatMap((o) => o.supportingItems).length,
    durationMs: 0,
  };
}

describe("flattenSessionItems", () => {
  it("dedupes overlapping supportingItems by URL across opportunities", () => {
    const shared = makeItem({ url: "https://example.com/shared", title: "Shared item" });
    const unique1 = makeItem({ url: "https://example.com/a", title: "Item A" });
    const unique2 = makeItem({ url: "https://example.com/b", title: "Item B" });

    const opportunities: Opportunity[] = [
      {
        id: "opp_1",
        title: "Group 1",
        summary: "s",
        keywords: [],
        supportingItems: [shared, unique1],
        sourceIds: ["test-source"],
      },
      {
        id: "opp_2",
        title: "Group 2",
        summary: "s",
        keywords: [],
        supportingItems: [shared, unique2],
        sourceIds: ["test-source"],
      },
    ];

    const session = makeSession(opportunities);
    const flattened = flattenSessionItems(session);

    expect(flattened).toHaveLength(3);
    expect(flattened.map((item) => item.url).sort()).toEqual(
      ["https://example.com/a", "https://example.com/b", "https://example.com/shared"].sort(),
    );
  });

  it("returns an empty array for a session with no opportunities", () => {
    const session = makeSession([]);
    expect(flattenSessionItems(session)).toEqual([]);
  });
});

describe("groupByCategory", () => {
  it("buckets a mixed set of items into their matching categories, including an item under multiple keys", () => {
    const complaintItem = makeItem({ url: "https://example.com/1", title: "This app is so annoying" });
    const praiseItem = makeItem({ url: "https://example.com/2", title: "I love this, amazing product" });
    const multiItem = makeItem({
      url: "https://example.com/3",
      title: "It's too expensive and it's broken",
    });
    const otherItem = makeItem({ url: "https://example.com/4", title: "Quarterly earnings report" });

    const grouped = groupByCategory([complaintItem, praiseItem, multiItem, otherItem]);

    expect(grouped.has("complaint")).toBe(true);
    expect(grouped.has("praise")).toBe(true);
    expect(grouped.has("pricing-complaint")).toBe(true);
    expect(grouped.has("bug")).toBe(true);
    expect(grouped.has("other")).toBe(true);

    // multiItem should appear under both pricing-complaint and bug.
    const pricingUrls = grouped.get("pricing-complaint")!.map((c) => c.item.url);
    const bugUrls = grouped.get("bug")!.map((c) => c.item.url);
    expect(pricingUrls).toContain(multiItem.url);
    expect(bugUrls).toContain(multiItem.url);

    // Categories with zero matching items are omitted entirely.
    expect(grouped.has("migration")).toBe(false);
  });

  it("returns an empty map for an empty item list", () => {
    expect(groupByCategory([]).size).toBe(0);
  });
});
