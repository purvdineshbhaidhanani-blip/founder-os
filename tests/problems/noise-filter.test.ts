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

describe("Loop 6, Part D — six additional noise archetypes (opinion/question/spam/showcase/hiring/demo)", () => {
  it("flags an opinion piece as noise (2 distinct opinion phrases -> multi-match rule)", () => {
    const item = makeItem({ url: "https://example.com/o1", title: "In my opinion, I think this whole industry is overrated" });
    const verdict = classifyDocumentType(item);
    expect(verdict.isNoise).toBe(true);
    expect(verdict.noiseType).toBe("opinion");
    expect(verdict.reasons.some((r) => r.includes("opinion"))).toBe(true);
  });

  it("flags a pure how-to question as noise (1 phrase, short title -> single-match rule)", () => {
    const item = makeItem({ url: "https://example.com/q1", title: "How do I reset my password" });
    const verdict = classifyDocumentType(item);
    expect(verdict.isNoise).toBe(true);
    expect(verdict.noiseType).toBe("question");
  });

  it("flags spam content as noise (3 distinct spam phrases -> multi-match rule)", () => {
    const item = makeItem({ url: "https://example.com/s1", title: "Click here for a limited time offer, buy now!" });
    const verdict = classifyDocumentType(item);
    expect(verdict.isNoise).toBe(true);
    expect(verdict.noiseType).toBe("spam");
  });

  it("flags a self-promotional project showcase as noise (2 distinct showcase phrases -> multi-match rule)", () => {
    const item = makeItem({ url: "https://example.com/sh1", title: "Check out my project, just launched after months of work" });
    const verdict = classifyDocumentType(item);
    expect(verdict.isNoise).toBe(true);
    expect(verdict.noiseType).toBe("showcase");
  });

  it("flags a hiring/recruiting post as noise (3 distinct hiring phrases -> multi-match rule)", () => {
    const item = makeItem({ url: "https://example.com/h1", title: "We're hiring! Join our team, now recruiting engineers" });
    const verdict = classifyDocumentType(item);
    expect(verdict.isNoise).toBe(true);
    expect(verdict.noiseType).toBe("hiring");
  });

  it("flags a demo/walkthrough promo as noise (2 distinct demo phrases -> multi-match rule)", () => {
    const item = makeItem({ url: "https://example.com/d1", title: "Watch this demo, see it in action right now" });
    const verdict = classifyDocumentType(item);
    expect(verdict.isNoise).toBe(true);
    expect(verdict.noiseType).toBe("demo");
  });

  it("SAFETY VALVE still protects a spam-flavored title that ALSO contains a real, confident complaint (unchanged threshold, reused)", () => {
    const item = makeItem({
      url: "https://example.com/valve1",
      title: "Buy now, limited time offer — this app is terrible, hate it, awful experience",
    });
    const classifiedResult = classifyItem(item);
    const complaintMatch = classifiedResult.categories.find((m) => m.category === "complaint");
    expect(complaintMatch?.confidence).toBeGreaterThanOrEqual(NOISE_SAFETY_VALVE_MIN_CATEGORY_CONFIDENCE);

    const verdict = classifyDocumentType(item);
    expect(verdict.isNoise).toBe(false);
    expect(verdict.reasons.some((r) => r.includes("Safety valve"))).toBe(true);

    // eslint-disable-next-line no-console
    console.log(`[Loop 6 Part D safety-valve example] reasons=${JSON.stringify(verdict.reasons)}`);
  });

  it("filterNoiseItems partitions a batch containing all six NEW archetypes correctly", () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/n1", title: "In my opinion, I think this whole industry is overrated" }),
      makeItem({ url: "https://example.com/n2", title: "Click here for a limited time offer, buy now!" }),
      makeItem({ url: "https://example.com/n3", title: "Check out my project, just launched after months of work" }),
      makeItem({ url: "https://example.com/n4", title: "We're hiring! Join our team, now recruiting engineers" }),
      makeItem({ url: "https://example.com/n5", title: "Watch this demo, see it in action right now" }),
      makeItem({ url: "https://example.com/real", title: "This app keeps crashing every time I open it" }),
    ];
    const result = filterNoiseItems(items);
    expect(result.noiseCount).toBe(5);
    expect(result.kept.map((i) => i.url)).toEqual(["https://example.com/real"]);
  });
});

describe("Part 1 — filterConfidence / keepReason / noiseReason (additive fields)", () => {
  it("a clean 3-phrase tutorial with NO competing real-category signal gets high filterConfidence (0.9) and a noiseReason", () => {
    const item = makeItem({
      url: "https://example.com/fc1",
      title: "How to get started: a step by step tutorial for beginners",
    });
    const verdict = classifyDocumentType(item);
    expect(verdict.isNoise).toBe(true);
    // noiseSignal tier(3 matches)=0.8, realSignal=0 -> filterConfidence = 0.5 + 0.8/2 = 0.9.
    expect(verdict.filterConfidence).toBeCloseTo(0.9, 5);
    expect(verdict.keepReason).toBeUndefined();
    expect(verdict.noiseReason).toBeDefined();
    expect(verdict.noiseReason).toContain("tutorial");
    expect(verdict.noiseReason).toContain("3 distinct noise phrase(s)");
  });

  it("a short-title single marketing-phrase match with no real-category signal gets moderate filterConfidence (0.65)", () => {
    const item = makeItem({ url: "https://example.com/fc2", title: "Top 10 productivity tools" });
    const verdict = classifyDocumentType(item);
    expect(verdict.isNoise).toBe(true);
    // noiseSignal tier(1 match)=0.3, realSignal=0 -> filterConfidence = 0.5 + 0.3/2 = 0.65.
    expect(verdict.filterConfidence).toBeCloseTo(0.65, 5);
    expect(verdict.noiseReason).toContain("marketing");
  });

  it("a long-title incidental single noise-phrase match (kept) gets LOW filterConfidence (0.35) and a keepReason citing the long-form title", () => {
    const item = makeItem({
      url: "https://example.com/fc3",
      title: "I wrote a long post exploring why our onboarding tutorial confused so many new users last quarter",
    });
    const verdict = classifyDocumentType(item);
    expect(verdict.isNoise).toBe(false);
    // noiseSignal tier(1 match)=0.3, realSignal=0 -> filterConfidence = 0.5 - 0.3/2 = 0.35.
    expect(verdict.filterConfidence).toBeCloseTo(0.35, 5);
    expect(verdict.noiseReason).toBeUndefined();
    expect(verdict.keepReason).toBeDefined();
    expect(verdict.keepReason).toContain("word(s)");
    expect(verdict.keepReason).toContain("long-form content");
  });

  it("a real, confident bug report with zero noise phrases gets HIGH filterConfidence (0.775) and a plain keepReason", () => {
    const item = makeItem({ url: "https://example.com/fc4", title: "This app keeps crashing every time I open it" });
    const verdict = classifyDocumentType(item);
    expect(verdict.isNoise).toBe(false);
    // noiseSignal=0 (no noise phrases), realSignal=confidenceForMatchCount(2 bug matches)=0.55
    // -> filterConfidence = 0.5 - (0 - 0.55)/2 = 0.775.
    expect(verdict.filterConfidence).toBeCloseTo(0.775, 5);
    expect(verdict.keepReason).toBe("No noise-list phrases matched any of the 12 noise archetypes.");
  });

  it("a safety-valve rescue nets a MODERATE filterConfidence (0.625) and a keepReason citing the rescuing category", () => {
    const item = makeItem({
      url: "https://example.com/fc5",
      title: "Step by step tutorial: why this tool is terrible, hate it, awful experience",
    });
    const verdict = classifyDocumentType(item);
    expect(verdict.isNoise).toBe(false);
    // noiseSignal tier(2 matches)=0.55, realSignal=confidenceForMatchCount(3 complaint matches)=0.8
    // -> filterConfidence = 0.5 - (0.55 - 0.8)/2 = 0.625.
    expect(verdict.filterConfidence).toBeCloseTo(0.625, 5);
    expect(verdict.keepReason).toBeDefined();
    expect(verdict.keepReason).toContain("safety valve");
    expect(verdict.keepReason).toContain("complaint");

    // eslint-disable-next-line no-console
    console.log(
      `[Part 1 example] filterConfidence=${verdict.filterConfidence}, keepReason="${verdict.keepReason}"`,
    );
  });

  it("filterConfidence is always within [0,1] and every verdict has exactly one of keepReason/noiseReason set", () => {
    const items: RawResearchItem[] = [
      makeItem({ url: "https://example.com/fc6", title: "Official docs: API reference for the SDK" }),
      makeItem({ url: "https://example.com/fc7", title: "Would be great if it supported dark mode" }),
      makeItem({ url: "https://example.com/fc8", title: "This week in tech: weekly roundup newsletter digest" }),
    ];
    for (const item of items) {
      const verdict = classifyDocumentType(item);
      expect(verdict.filterConfidence).toBeGreaterThanOrEqual(0);
      expect(verdict.filterConfidence).toBeLessThanOrEqual(1);
      if (verdict.isNoise) {
        expect(verdict.noiseReason).toBeDefined();
        expect(verdict.keepReason).toBeUndefined();
      } else {
        expect(verdict.keepReason).toBeDefined();
        expect(verdict.noiseReason).toBeUndefined();
      }
    }
  });
});
