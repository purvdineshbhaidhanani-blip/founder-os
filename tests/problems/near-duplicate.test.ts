import { describe, expect, it } from "vitest";
import { dedupeForEvidence, findNearDuplicates } from "../../src/problems/near-duplicate.js";
import type { RawResearchItem } from "../../src/research/types.js";

function makeItem(overrides: Partial<RawResearchItem> & { url: string }): RawResearchItem {
  return { title: "Untitled", sourceId: "src-a", ...overrides };
}

describe("findNearDuplicates", () => {
  it("groups a manufactured near-duplicate cross-post pair (same complaint, different title/source/url)", () => {
    // The gap this module fills: research/dedup.ts only dedupes by URL/TITLE
    // overlap upstream. Here, a GitHub issue and a Reddit thread report the
    // SAME underlying complaint in near-identical BODY prose, but with
    // completely different titles and URLs — research/dedup.ts would let
    // both through untouched.
    const githubIssue = makeItem({
      url: "https://github.com/acme/app/issues/42",
      title: "Bug: CSV export crashes on large files",
      body: "The export feature crashes every time I try to export a CSV file larger than 10000 rows on the dashboard page",
      sourceId: "github-issue",
      author: "dev123",
    });
    const redditThread = makeItem({
      url: "https://reddit.com/r/saas/comments/abc123",
      title: "Anyone else having export problems??",
      body: "The export feature crashes every time I try to export a CSV file larger than 10000 rows from the dashboard screen",
      sourceId: "reddit",
      author: "randomuser99",
    });
    const unrelatedItem = makeItem({
      url: "https://example.com/unrelated",
      title: "Totally different topic",
      body: "This is about pricing being too expensive for our small team's budget this quarter",
      sourceId: "hackernews",
    });

    const { groups, duplicateCount } = findNearDuplicates([githubIssue, redditThread, unrelatedItem]);

    expect(duplicateCount).toBe(1);
    const dupGroup = groups.find((g) => g.length === 2);
    expect(dupGroup).toBeDefined();
    expect(dupGroup!.map((i) => i.url).sort()).toEqual(
      ["https://github.com/acme/app/issues/42", "https://reddit.com/r/saas/comments/abc123"].sort(),
    );
    expect(groups.some((g) => g.length === 1 && g[0]!.url === unrelatedItem.url)).toBe(true);
  });

  it("treats 3 genuinely distinct items as 3 singleton groups (duplicateCount 0)", () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/1", title: "t", body: "the export feature crashes on large csv files" }),
      makeItem({ url: "https://example.com/2", title: "t", body: "pricing is way too expensive for a small startup budget" }),
      makeItem({ url: "https://example.com/3", title: "t", body: "would be great if this supported dark mode themes" }),
    ];
    const { groups, duplicateCount } = findNearDuplicates(items);
    expect(groups).toHaveLength(3);
    expect(duplicateCount).toBe(0);
  });

  it("never groups two items that both have empty body/snippet as duplicates of each other", () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/1", title: "Some title" }),
      makeItem({ url: "https://example.com/2", title: "Different title" }),
    ];
    const { groups, duplicateCount } = findNearDuplicates(items);
    expect(groups).toHaveLength(2);
    expect(duplicateCount).toBe(0);
  });

  it("falls back to `snippet` when `body` is absent", () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/1", title: "t", snippet: "the export feature crashes on large csv files every time" }),
      makeItem({ url: "https://example.com/2", title: "t2", snippet: "the export feature crashes on large csv files every time" }),
    ];
    const { duplicateCount } = findNearDuplicates(items);
    expect(duplicateCount).toBe(1);
  });

  it("returns an empty result for an empty item list", () => {
    expect(findNearDuplicates([])).toEqual({ groups: [], duplicateCount: 0 });
  });
});

describe("dedupeForEvidence", () => {
  it("keeps the earliest-publishedAt representative from a near-duplicate group", () => {
    const later = makeItem({
      url: "https://example.com/later",
      title: "t",
      body: "the export feature crashes on large csv files every single time",
      publishedAt: "2026-01-10T00:00:00.000Z",
    });
    const earlier = makeItem({
      url: "https://example.com/earlier",
      title: "t2",
      body: "the export feature crashes on large csv files every single time",
      publishedAt: "2026-01-01T00:00:00.000Z",
    });
    const result = dedupeForEvidence([later, earlier]);
    expect(result).toHaveLength(1);
    expect(result[0]!.url).toBe("https://example.com/earlier");
  });

  it("falls back to first-encountered when no group member has publishedAt", () => {
    const first = makeItem({ url: "https://example.com/first", title: "t", body: "the export feature crashes on large csv files every single time" });
    const second = makeItem({ url: "https://example.com/second", title: "t2", body: "the export feature crashes on large csv files every single time" });
    const result = dedupeForEvidence([first, second]);
    expect(result).toHaveLength(1);
    expect(result[0]!.url).toBe("https://example.com/first");
  });

  it("returns every item unchanged when none are near-duplicates (evidence count preserved)", () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/1", title: "t", body: "the export feature crashes on large csv files" }),
      makeItem({ url: "https://example.com/2", title: "t", body: "pricing is way too expensive for a small startup budget" }),
    ];
    const result = dedupeForEvidence(items);
    expect(result).toHaveLength(2);
  });
});
