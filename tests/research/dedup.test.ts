import { describe, expect, it } from "vitest";
import { dedupeItems } from "../../src/research/dedup.js";
import type { RawResearchItem } from "../../src/research/types.js";

function item(overrides: Partial<RawResearchItem> & { title: string; url: string }): RawResearchItem {
  return { sourceId: "test", ...overrides };
}

describe("dedupeItems", () => {
  it("drops exact URL duplicates, keeping the first occurrence", () => {
    const items: RawResearchItem[] = [
      item({ title: "Founders launch new SaaS billing tool", url: "https://example.com/a", engagement: 5 }),
      item({ title: "A totally different headline about something", url: "https://example.com/a", engagement: 99 }),
      item({ title: "Something else entirely unrelated topic here", url: "https://example.com/b" }),
    ];

    const result = dedupeItems(items);

    expect(result).toHaveLength(2);
    expect(result.find((i) => i.url === "https://example.com/a")?.engagement).toBe(5);
  });

  it("merges near-identical titles (>=70% keyword overlap) and keeps the higher-engagement item", () => {
    const items: RawResearchItem[] = [
      item({
        title: "Startup launches new billing automation platform",
        url: "https://example.com/low",
        engagement: 10,
      }),
      item({
        title: "Startup launches new billing automation software",
        url: "https://example.com/high",
        engagement: 500,
      }),
    ];

    const result = dedupeItems(items);

    expect(result).toHaveLength(1);
    expect(result[0]?.url).toBe("https://example.com/high");
    expect(result[0]?.engagement).toBe(500);
  });

  it("keeps the first-seen item when engagement is tied or missing", () => {
    const items: RawResearchItem[] = [
      item({ title: "Founders raise seed round for developer tools startup", url: "https://example.com/first" }),
      item({ title: "Founders raise seed round for developer tools company", url: "https://example.com/second" }),
    ];

    const result = dedupeItems(items);

    expect(result).toHaveLength(1);
    expect(result[0]?.url).toBe("https://example.com/first");
  });

  it("does not merge genuinely different items with low keyword overlap", () => {
    const items: RawResearchItem[] = [
      item({ title: "Weather forecast shows heavy rain across the region", url: "https://example.com/weather" }),
      item({ title: "New database indexing algorithm improves query speed", url: "https://example.com/database" }),
      item({ title: "Local bakery expands into three new neighborhoods", url: "https://example.com/bakery" }),
    ];

    const result = dedupeItems(items);

    expect(result).toHaveLength(3);
  });

  it("returns an empty array for empty input and is a pure function (no mutation of input)", () => {
    const items: RawResearchItem[] = [
      item({ title: "Original unmodified title for purity check", url: "https://example.com/pure" }),
    ];
    const snapshot = JSON.parse(JSON.stringify(items));

    expect(dedupeItems([])).toEqual([]);
    dedupeItems(items);
    expect(items).toEqual(snapshot);
  });
});
