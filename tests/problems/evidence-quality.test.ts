import { describe, expect, it } from "vitest";
import {
  computeAverageEvidenceQuality,
  computeEvidenceQuality,
  EVIDENCE_QUALITY_WEIGHTS,
} from "../../src/problems/evidence-quality.js";
import type { RawResearchItem } from "../../src/research/types.js";

function makeItem(overrides: Partial<RawResearchItem> & { url: string }): RawResearchItem {
  return { title: "Untitled", sourceId: "src-a", ...overrides };
}

describe("EVIDENCE_QUALITY_WEIGHTS", () => {
  it("sums to exactly 1.0", () => {
    const total = Object.values(EVIDENCE_QUALITY_WEIGHTS).reduce((sum, w) => sum + w, 0);
    expect(total).toBeCloseTo(1.0, 10);
  });
});

describe("computeEvidenceQuality", () => {
  it("computes the exact formula for a high-quality github-issue item", () => {
    // specificity: 20-word body >= 15-word threshold -> component 1.
    const body =
      "The export button crashes every single time I click it and the error log shows a null reference exception here";
    const item = makeItem({
      url: "https://example.com/1",
      title: "Export crashes with a null reference",
      body,
      sourceId: "github-issue",
      engagement: 25,
    });

    const wordCount = body.trim().split(/\s+/).length;
    expect(wordCount).toBe(20);

    const result = computeEvidenceQuality(item);

    const specificity = Math.min(1, wordCount / 15); // = 1 (capped)
    const engagement = Math.min(1, 25 / 50); // = 0.5
    const sourceCredibility = 0.9; // github-issue table weight
    // "crashes"/"bug"/"error"/"not working" style match -> bug category, high confidence -> problemClarity 1
    const problemClarity = 1;

    const expectedScore =
      specificity * EVIDENCE_QUALITY_WEIGHTS.specificity +
      engagement * EVIDENCE_QUALITY_WEIGHTS.engagement +
      sourceCredibility * EVIDENCE_QUALITY_WEIGHTS.sourceCredibility +
      problemClarity * EVIDENCE_QUALITY_WEIGHTS.problemClarity;

    expect(result.score).toBeCloseTo(expectedScore, 5);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("scores a thin, low-engagement, unknown-source, non-problem item near the bottom", () => {
    const item = makeItem({ url: "https://example.com/2", title: "Just a normal day", sourceId: "some-random-blog" });
    const result = computeEvidenceQuality(item);

    // specificity: no body/snippet -> 0 words -> 0.
    // engagement: undefined -> 0.
    // sourceCredibility: unknown source -> DEFAULT_SOURCE_CREDIBILITY_WEIGHT (0.5).
    // problemClarity: no real category match -> 0.
    const expectedScore = 0 * 0.25 + 0 * 0.25 + 0.5 * 0.25 + 0 * 0.25;
    expect(result.score).toBeCloseTo(expectedScore, 5);
  });

  it("falls back to `snippet` when `body` is absent", () => {
    const longSnippet = Array.from({ length: 20 }, (_, i) => `word${i}`).join(" ");
    const item = makeItem({ url: "https://example.com/3", title: "t", snippet: longSnippet });
    const result = computeEvidenceQuality(item);
    expect(result.reasons.some((r) => r.startsWith("specificity: 20 word"))).toBe(true);
  });

  it("uses the fixed per-source credibility table for known sources", () => {
    const sources: Array<{ sourceId: string; expected: number }> = [
      { sourceId: "github-issue", expected: 0.9 },
      { sourceId: "stackexchange", expected: 0.8 },
      { sourceId: "hackernews", expected: 0.75 },
      { sourceId: "reddit", expected: 0.65 },
      { sourceId: "producthunt", expected: 0.6 },
      { sourceId: "rss", expected: 0.4 },
    ];
    for (const { sourceId, expected } of sources) {
      const item = makeItem({ url: `https://example.com/${sourceId}`, title: "t", sourceId });
      const result = computeEvidenceQuality(item);
      expect(result.reasons.some((r) => r.includes(`-> ${expected.toFixed(2)}`))).toBe(true);
    }
  });

  it("problem clarity is 1 only when a real category matches at confidence >= 0.55", () => {
    const clear = makeItem({ url: "https://example.com/4", title: "This app keeps crashing, buggy, always broken" });
    const unclear = makeItem({ url: "https://example.com/5", title: "It's a little annoying sometimes" });

    expect(computeEvidenceQuality(clear).reasons.some((r) => r.includes("problemClarity") && r.endsWith("-> 1."))).toBe(
      true,
    );
    expect(
      computeEvidenceQuality(unclear).reasons.some((r) => r.includes("problemClarity") && r.endsWith("-> 0.")),
    ).toBe(true);
  });
});

describe("computeAverageEvidenceQuality", () => {
  it("returns the unweighted mean across items", () => {
    const a = makeItem({ url: "https://example.com/a", title: "t", sourceId: "github-issue", engagement: 50 });
    const b = makeItem({ url: "https://example.com/b", title: "t", sourceId: "rss" });
    const avg = computeAverageEvidenceQuality([a, b]);
    const expected = (computeEvidenceQuality(a).score + computeEvidenceQuality(b).score) / 2;
    expect(avg).toBeCloseTo(expected, 10);
  });

  it("returns 0 (honest, not fabricated) for an empty item list", () => {
    expect(computeAverageEvidenceQuality([])).toBe(0);
  });
});
