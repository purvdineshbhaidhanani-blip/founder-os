import { describe, expect, it } from "vitest";
import {
  classifyDocumentType,
  filterNoiseItems,
  NOISE_SAFETY_VALVE_MIN_CATEGORY_CONFIDENCE,
} from "../../src/problems/noise-filter.js";
import { classifyItem } from "../../src/problems/detector.js";
import { groupByCategory } from "../../src/problems/clustering.js";
import type { RawResearchItem } from "../../src/research/types.js";

function makeItem(overrides: Partial<RawResearchItem> & { url: string }): RawResearchItem {
  return { title: "Untitled", sourceId: "src-a", ...overrides };
}

describe("classifyDocumentType", () => {
  it("named the safety-valve threshold constant at exactly 0.55", () => {
    expect(NOISE_SAFETY_VALVE_MIN_CATEGORY_CONFIDENCE).toBe(0.55);
  });

  it("flags a tutorial post as noise (3 distinct tutorial phrases -> multi-match rule)", () => {
    const item = makeItem({
      url: "https://example.com/1",
      title: "How to get started: a step by step tutorial for beginners",
    });
    const verdict = classifyDocumentType(item);
    expect(verdict.isNoise).toBe(true);
    expect(verdict.noiseType).toBe("tutorial");
    expect(verdict.reasons.some((r) => r.includes("tutorial"))).toBe(true);
  });

  it("flags an official-docs post as noise (2 distinct documentation phrases)", () => {
    const item = makeItem({
      url: "https://example.com/2",
      title: "Official docs: API reference for the SDK",
    });
    const verdict = classifyDocumentType(item);
    expect(verdict.isNoise).toBe(true);
    expect(verdict.noiseType).toBe("documentation");
  });

  it("flags a short-title single-noise-phrase marketing listicle as noise (<= 8 words)", () => {
    const item = makeItem({ url: "https://example.com/3", title: "Top 10 productivity tools" });
    // 1 matched phrase ("top 10"), title word count = 4 <= 8 -> noise.
    const verdict = classifyDocumentType(item);
    expect(verdict.isNoise).toBe(true);
    expect(verdict.noiseType).toBe("marketing");
  });

  it("does NOT flag a long-title single-incidental-noise-phrase post as noise (> 8 words)", () => {
    const item = makeItem({
      url: "https://example.com/4",
      title: "I wrote a long post exploring why our onboarding tutorial confused so many new users last quarter",
    });
    // 1 matched phrase ("tutorial"), title word count > 8 -> not noise.
    const verdict = classifyDocumentType(item);
    expect(verdict.isNoise).toBe(false);
    expect(verdict.reasons.some((r) => r.includes("not noise"))).toBe(true);
  });

  it("does not flag an item with zero noise-phrase matches", () => {
    const item = makeItem({ url: "https://example.com/5", title: "This app keeps crashing every time I open it" });
    const verdict = classifyDocumentType(item);
    expect(verdict.isNoise).toBe(false);
    expect(verdict.noiseType).toBeUndefined();
  });

  it("SAFETY VALVE: a tutorial-flavored title that ALSO contains a real, confident complaint survives", () => {
    const item = makeItem({
      url: "https://example.com/6",
      title: "Step by step tutorial: why this tool is terrible, hate it, awful experience",
    });
    // Would trip the multi-match noise rule ("step by step" + "tutorial" =
    // 2 distinct tutorial phrases) if not for the safety valve.
    const withoutValve = classifyItem(item);
    const complaintMatch = withoutValve.categories.find((m) => m.category === "complaint");
    expect(complaintMatch).toBeDefined();
    expect(complaintMatch!.confidence).toBeGreaterThanOrEqual(NOISE_SAFETY_VALVE_MIN_CATEGORY_CONFIDENCE);

    const verdict = classifyDocumentType(item);
    expect(verdict.isNoise).toBe(false);
    expect(verdict.reasons.some((r) => r.includes("Safety valve"))).toBe(true);
  });

  it("does NOT apply the safety valve when the real category match is below the confidence threshold", () => {
    // Only 1 complaint pattern ("annoying") -> confidence 0.3, below 0.55 ->
    // safety valve does not fire, multi-match noise verdict stands.
    const item = makeItem({
      url: "https://example.com/7",
      title: "Step by step tutorial guide to our slightly annoying setup process",
    });
    const classified = classifyItem(item);
    const complaintMatch = classified.categories.find((m) => m.category === "complaint");
    expect(complaintMatch?.confidence).toBeLessThan(NOISE_SAFETY_VALVE_MIN_CATEGORY_CONFIDENCE);

    const verdict = classifyDocumentType(item);
    expect(verdict.isNoise).toBe(true);
  });
});

describe("filterNoiseItems", () => {
  it("partitions a mixed list into kept/noiseItems with an accurate count", () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/1", title: "How to get started: a step by step tutorial for beginners" }),
      makeItem({ url: "https://example.com/2", title: "Official docs: API reference for the SDK" }),
      makeItem({ url: "https://example.com/3", title: "This app keeps crashing every time I open it" }),
      makeItem({ url: "https://example.com/4", title: "Would be great if it supported dark mode" }),
    ];

    const result = filterNoiseItems(items);
    expect(result.noiseCount).toBe(2);
    expect(result.noiseItems.map((i) => i.url).sort()).toEqual(["https://example.com/1", "https://example.com/2"]);
    expect(result.kept.map((i) => i.url).sort()).toEqual(["https://example.com/3", "https://example.com/4"]);
  });

  it("returns everything kept, zero noise, for an empty or all-clean list", () => {
    expect(filterNoiseItems([])).toEqual({ kept: [], noiseItems: [], noiseCount: 0 });
  });
});

describe("noise filter reduces uncategorized ('other') signal — real before/after counts", () => {
  it("removes tutorial/docs/marketing/newsletter/event items that would otherwise have landed in the catch-all 'other' bucket", () => {
    // A realistic mixed batch: 4 genuine problem-signal items + 5 pure-noise
    // items that match NO real category pattern (so, pre-filter, they would
    // all land in "other" — pure uncategorized noise diluting that bucket).
    const noiseOnlyItems: RawResearchItem[] = [
      makeItem({ url: "https://example.com/n1", title: "How to get started: a step by step tutorial for beginners" }),
      makeItem({ url: "https://example.com/n2", title: "Official docs: API reference for the SDK" }),
      makeItem({ url: "https://example.com/n3", title: "We're excited to announce our new release notes and changelog" }),
      makeItem({ url: "https://example.com/n4", title: "This week in tech: weekly roundup newsletter digest" }),
      makeItem({ url: "https://example.com/n5", title: "Join us at our webinar, register now for the conference" }),
    ];
    const realSignalItems: RawResearchItem[] = [
      makeItem({ url: "https://example.com/r1", title: "This app keeps crashing every time I open it" }),
      makeItem({ url: "https://example.com/r2", title: "Would be great if it supported dark mode" }),
      makeItem({ url: "https://example.com/r3", title: "Willing to pay for a tool that fixes this" }),
      makeItem({ url: "https://example.com/r4", title: "Terrible experience, hate it, worst tool ever" }),
    ];

    const allItems = [...noiseOnlyItems, ...realSignalItems];

    // BEFORE: every noise-only item matches no category pattern -> "other".
    const beforeGrouped = groupByCategory(allItems);
    const beforeOtherCount = beforeGrouped.get("other")?.length ?? 0;

    // AFTER: Part 1 noise filter removes the 5 noise-only items first.
    const { kept, noiseCount } = filterNoiseItems(allItems);
    const afterGrouped = groupByCategory(kept);
    const afterOtherCount = afterGrouped.get("other")?.length ?? 0;

    // eslint-disable-next-line no-console
    console.log(
      `[noise-filter before/after] other-bucket count: before=${beforeOtherCount}, after=${afterOtherCount}, noiseRemoved=${noiseCount}`,
    );

    expect(noiseCount).toBe(5);
    expect(beforeOtherCount).toBe(5);
    expect(afterOtherCount).toBe(0);
    expect(afterOtherCount).toBeLessThan(beforeOtherCount);
  });
});
