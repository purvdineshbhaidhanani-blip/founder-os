import { describe, expect, it } from "vitest";
import { computeFrequency } from "../../src/problems/frequency.js";
import type { RawResearchItem } from "../../src/research/types.js";

function makeItem(overrides: Partial<RawResearchItem> & { url: string }): RawResearchItem {
  return { title: "Untitled", sourceId: "src-a", ...overrides };
}

const DAY_MS = 24 * 60 * 60 * 1000;

describe("computeFrequency", () => {
  it("counts uniqueAuthors and uniqueSources, ignoring empty/missing authors", () => {
    const items = [
      makeItem({ url: "https://example.com/1", author: "alice", sourceId: "reddit" }),
      makeItem({ url: "https://example.com/2", author: "bob", sourceId: "reddit" }),
      makeItem({ url: "https://example.com/3", author: "alice", sourceId: "hackernews" }),
      makeItem({ url: "https://example.com/4", author: "", sourceId: "hackernews" }),
      makeItem({ url: "https://example.com/5", sourceId: "hackernews" }),
    ];
    const stats = computeFrequency(items, 30);
    expect(stats.mentions).toBe(5);
    expect(stats.uniqueAuthors).toBe(2);
    expect(stats.uniqueSources).toBe(2);
  });

  it("returns insufficient-data growth when fewer than 4 items have publishedAt", () => {
    const items = [
      makeItem({ url: "https://example.com/1", publishedAt: new Date().toISOString() }),
      makeItem({ url: "https://example.com/2", publishedAt: new Date().toISOString() }),
      makeItem({ url: "https://example.com/3" }),
    ];
    const stats = computeFrequency(items, 30);
    expect(stats.growth).toEqual({
      label: "insufficient-data",
      recentHalfCount: 0,
      earlierHalfCount: 0,
      ratio: null,
    });
  });

  it("labels growth as rising when recent mentions dominate", () => {
    const now = Date.now();
    const windowDays = 30;
    // recent items: within the last windowDays/2 days
    const items = [
      makeItem({ url: "https://example.com/1", publishedAt: new Date(now).toISOString() }),
      makeItem({ url: "https://example.com/2", publishedAt: new Date(now - 1 * DAY_MS).toISOString() }),
      makeItem({ url: "https://example.com/3", publishedAt: new Date(now - 2 * DAY_MS).toISOString() }),
      // one earlier item, near the start of the window
      makeItem({
        url: "https://example.com/4",
        publishedAt: new Date(now - windowDays * DAY_MS + 1 * DAY_MS).toISOString(),
      }),
    ];
    const stats = computeFrequency(items, windowDays);
    expect(stats.growth.label).toBe("rising");
    expect(stats.growth.recentHalfCount).toBe(3);
    expect(stats.growth.earlierHalfCount).toBe(1);
    expect(stats.growth.ratio).toBe(3);
  });

  it("labels growth as declining when earlier mentions dominate", () => {
    const now = Date.now();
    const windowDays = 30;
    const items = [
      makeItem({
        url: "https://example.com/1",
        publishedAt: new Date(now - windowDays * DAY_MS + 1 * DAY_MS).toISOString(),
      }),
      makeItem({
        url: "https://example.com/2",
        publishedAt: new Date(now - windowDays * DAY_MS + 2 * DAY_MS).toISOString(),
      }),
      makeItem({
        url: "https://example.com/3",
        publishedAt: new Date(now - windowDays * DAY_MS + 3 * DAY_MS).toISOString(),
      }),
      makeItem({ url: "https://example.com/4", publishedAt: new Date(now).toISOString() }),
    ];
    const stats = computeFrequency(items, windowDays);
    expect(stats.growth.label).toBe("declining");
    expect(stats.growth.recentHalfCount).toBe(1);
    expect(stats.growth.earlierHalfCount).toBe(3);
  });

  it("labels growth as stable when recent/earlier are roughly balanced", () => {
    const now = Date.now();
    const windowDays = 30;
    const items = [
      makeItem({ url: "https://example.com/1", publishedAt: new Date(now).toISOString() }),
      makeItem({ url: "https://example.com/2", publishedAt: new Date(now - 1 * DAY_MS).toISOString() }),
      makeItem({
        url: "https://example.com/3",
        publishedAt: new Date(now - windowDays * DAY_MS + 1 * DAY_MS).toISOString(),
      }),
      makeItem({
        url: "https://example.com/4",
        publishedAt: new Date(now - windowDays * DAY_MS + 2 * DAY_MS).toISOString(),
      }),
    ];
    const stats = computeFrequency(items, windowDays);
    expect(stats.growth.label).toBe("stable");
    expect(stats.growth.ratio).toBe(1);
  });
});
