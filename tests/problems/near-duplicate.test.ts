import { describe, expect, it } from "vitest";
import {
  countCrossSourceDuplicateGroups,
  countCrossSourceDuplicates,
  dedupeForEvidence,
  findNearDuplicates,
  findSemanticDuplicateGroups,
  findSemanticDuplicates,
} from "../../src/problems/near-duplicate.js";
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

describe("Loop 6, Part E — findSemanticDuplicates / findSemanticDuplicateGroups", () => {
  const slowLaggyBody =
    "The app is so slow and laggy, it takes too long to load every single time I open it and it feels completely broken, extremely frustrating";

  it("flags a near-duplicate group as SEMANTIC when every member maps to the SAME concept.ts concept id", () => {
    const a = makeItem({ url: "https://example.com/sem1", title: "Slow app", body: slowLaggyBody, sourceId: "reddit" });
    const b = makeItem({ url: "https://example.com/sem2", title: "So laggy lately", body: slowLaggyBody, sourceId: "hackernews" });

    const result = findSemanticDuplicates([a, b], "bug");
    expect(result).toHaveLength(1);
    expect(result[0]!.conceptId).toBe("performance-app-is-slow");
    expect(result[0]!.items.map((i) => i.url).sort()).toEqual([a.url, b.url].sort());
  });

  it("does NOT flag a near-duplicate group as semantic when no item in the group matches any concept for that category", () => {
    const body = "this happened to me too honestly, we experienced the exact same painful situation as everyone else here";
    const a = makeItem({ url: "https://example.com/nc1", title: "t", body });
    const b = makeItem({ url: "https://example.com/nc2", title: "t2", body });

    // Confirm the pair IS still a body-text near-duplicate (that part is unaffected)...
    const { groups } = findNearDuplicates([a, b]);
    expect(groups.some((g) => g.length === 2)).toBe(true);

    // ...but it's not flagged SEMANTIC, because the body matches no "bug" concept group.
    const result = findSemanticDuplicates([a, b], "bug");
    expect(result).toEqual([]);
  });

  it("does NOT flag a group of 1 (no near-duplicate at all) as semantic", () => {
    const a = makeItem({ url: "https://example.com/single1", title: "t", body: slowLaggyBody });
    expect(findSemanticDuplicates([a], "bug")).toEqual([]);
  });

  it("findSemanticDuplicateGroups reuses an ALREADY-COMPUTED `groups` array (no internal findNearDuplicates call, Part G)", () => {
    const a = makeItem({ url: "https://example.com/reuse1", title: "t", body: slowLaggyBody });
    const b = makeItem({ url: "https://example.com/reuse2", title: "t2", body: slowLaggyBody });
    const { groups } = findNearDuplicates([a, b]);

    const result = findSemanticDuplicateGroups(groups, "bug");
    expect(result).toHaveLength(1);
    expect(result[0]!.conceptId).toBe("performance-app-is-slow");
  });
});

describe("Loop 6, Part E — countCrossSourceDuplicates / countCrossSourceDuplicateGroups", () => {
  const duplicateBody = "the export feature crashes every time I try to export a csv file larger than 10000 rows";

  it("counts a near-duplicate group spanning 2+ DISTINCT sourceIds as a cross-source duplicate group", () => {
    const a = makeItem({ url: "https://example.com/cs1", title: "t", body: duplicateBody, sourceId: "github-issue" });
    const b = makeItem({ url: "https://example.com/cs2", title: "t2", body: duplicateBody, sourceId: "reddit" });
    expect(countCrossSourceDuplicates([a, b])).toBe(1);
  });

  it("does NOT count a same-source repost group as cross-source", () => {
    const a = makeItem({ url: "https://example.com/ss1", title: "t", body: duplicateBody, sourceId: "reddit" });
    const b = makeItem({ url: "https://example.com/ss2", title: "t2", body: duplicateBody, sourceId: "reddit" });
    expect(countCrossSourceDuplicates([a, b])).toBe(0);
  });

  it("returns 0 when there are no near-duplicate groups at all", () => {
    const a = makeItem({ url: "https://example.com/none1", title: "t", body: "aaaa bbbb cccc dddd" });
    const b = makeItem({ url: "https://example.com/none2", title: "t2", body: "wxyz vuts qrst" });
    expect(countCrossSourceDuplicates([a, b])).toBe(0);
  });

  it("countCrossSourceDuplicateGroups reuses an ALREADY-COMPUTED `groups` array (no internal findNearDuplicates call, Part G)", () => {
    const a = makeItem({ url: "https://example.com/reuse-cs1", title: "t", body: duplicateBody, sourceId: "github-issue" });
    const b = makeItem({ url: "https://example.com/reuse-cs2", title: "t2", body: duplicateBody, sourceId: "reddit" });
    const c = makeItem({ url: "https://example.com/reuse-cs3", title: "t3", body: duplicateBody, sourceId: "reddit" });
    const { groups } = findNearDuplicates([a, b, c]);

    expect(countCrossSourceDuplicateGroups(groups)).toBe(1);
  });
});
