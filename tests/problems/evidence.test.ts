import { describe, expect, it } from "vitest";
import { buildClusterEvidence } from "../../src/problems/evidence.js";
import type { RawResearchItem } from "../../src/research/types.js";

function makeItem(overrides: Partial<RawResearchItem> & { url: string }): RawResearchItem {
  return { title: "Untitled", sourceId: "src-a", ...overrides };
}

describe("buildClusterEvidence", () => {
  it("counts sourceBreakdown per sourceId", () => {
    const items = [
      makeItem({ url: "https://example.com/1", sourceId: "reddit" }),
      makeItem({ url: "https://example.com/2", sourceId: "reddit" }),
      makeItem({ url: "https://example.com/3", sourceId: "hackernews" }),
    ];
    const evidence = buildClusterEvidence(items);
    expect(evidence.sourceBreakdown).toEqual({ reddit: 2, hackernews: 1 });
    expect(evidence.evidenceCount).toBe(3);
  });

  it("dedupes originalUrls", () => {
    const items = [
      makeItem({ url: "https://example.com/dup" }),
      makeItem({ url: "https://example.com/dup" }),
      makeItem({ url: "https://example.com/other" }),
    ];
    const evidence = buildClusterEvidence(items);
    expect(evidence.originalUrls.sort()).toEqual(["https://example.com/dup", "https://example.com/other"]);
  });

  it("sums engagementTotal across items, treating missing engagement as 0", () => {
    const items = [
      makeItem({ url: "https://example.com/1", engagement: 5 }),
      makeItem({ url: "https://example.com/2", engagement: 10 }),
      makeItem({ url: "https://example.com/3" }),
    ];
    const evidence = buildClusterEvidence(items);
    expect(evidence.engagementTotal).toBe(15);
  });

  it("ranks representativeExamples by engagement descending, taking top 3", () => {
    const items = [
      makeItem({ url: "https://example.com/1", title: "low", engagement: 1 }),
      makeItem({ url: "https://example.com/2", title: "high", engagement: 100 }),
      makeItem({ url: "https://example.com/3", title: "mid", engagement: 50 }),
      makeItem({ url: "https://example.com/4", title: "lowest", engagement: 0 }),
    ];
    const evidence = buildClusterEvidence(items);
    expect(evidence.representativeExamples.map((i) => i.title)).toEqual(["high", "mid", "low"]);
  });

  it("falls back to first-3 array order when no item has engagement data", () => {
    const items = [
      makeItem({ url: "https://example.com/1", title: "first" }),
      makeItem({ url: "https://example.com/2", title: "second" }),
      makeItem({ url: "https://example.com/3", title: "third" }),
      makeItem({ url: "https://example.com/4", title: "fourth" }),
    ];
    const evidence = buildClusterEvidence(items);
    expect(evidence.representativeExamples.map((i) => i.title)).toEqual(["first", "second", "third"]);
  });

  it("computes dateRange min/max from items with publishedAt", () => {
    const items = [
      makeItem({ url: "https://example.com/1", publishedAt: "2026-06-01T00:00:00.000Z" }),
      makeItem({ url: "https://example.com/2", publishedAt: "2026-06-15T00:00:00.000Z" }),
      makeItem({ url: "https://example.com/3", publishedAt: "2026-05-20T00:00:00.000Z" }),
    ];
    const evidence = buildClusterEvidence(items);
    expect(evidence.dateRange).toEqual({
      earliest: "2026-05-20T00:00:00.000Z",
      latest: "2026-06-15T00:00:00.000Z",
    });
  });

  it("returns null dateRange when no items have publishedAt", () => {
    const items = [makeItem({ url: "https://example.com/1" }), makeItem({ url: "https://example.com/2" })];
    const evidence = buildClusterEvidence(items);
    expect(evidence.dateRange).toBeNull();
  });
});
