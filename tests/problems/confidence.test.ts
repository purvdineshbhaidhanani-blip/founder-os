import { describe, expect, it } from "vitest";
import { computeClusterConfidence } from "../../src/problems/confidence.js";
import type { ClusterEvidence, FrequencyStats } from "../../src/problems/types.js";

function evidence(evidenceCount: number): ClusterEvidence {
  return {
    evidenceCount,
    sourceBreakdown: {},
    originalUrls: [],
    representativeExamples: [],
    engagementTotal: 0,
    dateRange: null,
  };
}

function frequency(uniqueSources: number, uniqueAuthors: number): FrequencyStats {
  return {
    mentions: 0,
    uniqueAuthors,
    uniqueSources,
    engagementTotal: 0,
    growth: { label: "insufficient-data", recentHalfCount: 0, earlierHalfCount: 0, ratio: null },
  };
}

describe("computeClusterConfidence", () => {
  it("computes the exact formula for 8 mentions / 3 sources / 5 authors", () => {
    const ev = evidence(8);
    const freq = frequency(3, 5);
    // baseScore = min(1, 8/10) = 0.8
    // sourceDiversityBonus = min(0.3, 3*0.1) = 0.3
    // authorDiversityBonus = min(0.2, 5*0.05) = 0.2
    // score = min(1, 0.8*0.5 + 0.3 + 0.2) = min(1, 0.9) = 0.9
    const result = computeClusterConfidence(ev, freq);
    expect(result.score).toBeCloseTo(0.9, 5);
    expect(result.band).toBe("high");
    expect(result.explanation).toBe(
      "8 mentions across 3 source(s) by 5 unique author(s) -> high confidence (score 0.90).",
    );
  });

  it("computes medium band for a moderate combo", () => {
    const ev = evidence(4);
    const freq = frequency(2, 2);
    // baseScore = min(1, 4/10) = 0.4
    // sourceDiversityBonus = min(0.3, 0.2) = 0.2
    // authorDiversityBonus = min(0.2, 0.1) = 0.1
    // score = min(1, 0.4*0.5 + 0.2 + 0.1) = 0.5
    const result = computeClusterConfidence(ev, freq);
    expect(result.score).toBeCloseTo(0.5, 5);
    expect(result.band).toBe("medium");
  });

  it("computes low band for sparse evidence with 2+ sources", () => {
    const ev = evidence(1);
    const freq = frequency(2, 1);
    // baseScore = min(1, 0.1) = 0.1
    // sourceDiversityBonus = min(0.3, 0.2) = 0.2
    // authorDiversityBonus = min(0.2, 0.05) = 0.05
    // score = min(1, 0.05 + 0.2 + 0.05) = 0.3
    const result = computeClusterConfidence(ev, freq);
    expect(result.score).toBeCloseTo(0.3, 5);
    expect(result.band).toBe("low");
    expect(result.explanation).not.toContain("Single-source");
  });

  it("forces band to low when uniqueSources < 2, regardless of the numeric score", () => {
    const ev = evidence(20);
    const freq = frequency(1, 10);
    // baseScore = min(1, 2) = 1
    // sourceDiversityBonus = min(0.3, 0.1) = 0.1
    // authorDiversityBonus = min(0.2, 0.5) = 0.2
    // score = min(1, 0.5 + 0.1 + 0.2) = 0.8 -- would be "high" but single-source forces "low"
    const result = computeClusterConfidence(ev, freq);
    expect(result.score).toBeCloseTo(0.8, 5);
    expect(result.band).toBe("low");
    expect(result.explanation).toContain("Single-source evidence capped at low confidence.");
  });

  it("forces band to low with zero sources too", () => {
    const result = computeClusterConfidence(evidence(0), frequency(0, 0));
    expect(result.band).toBe("low");
    expect(result.score).toBe(0);
  });
});

describe("computeClusterConfidence — Loop 5 additive evidenceQuality/duplicateRatio params", () => {
  it("omitting the new params produces byte-for-byte the same result as before this loop", () => {
    const ev = evidence(8);
    const freq = frequency(3, 5);
    const withoutNewParams = computeClusterConfidence(ev, freq);
    expect(withoutNewParams.score).toBeCloseTo(0.9, 5);
    expect(withoutNewParams.band).toBe("high");
    expect(withoutNewParams.explanation).toBe(
      "8 mentions across 3 source(s) by 5 unique author(s) -> high confidence (score 0.90).",
    );
  });

  it("passing the neutral defaults explicitly (0.5, 0) produces the exact same SCORE as omitting them", () => {
    const ev = evidence(8);
    const freq = frequency(3, 5);
    const withDefaults = computeClusterConfidence(ev, freq, 0.5, 0);
    expect(withDefaults.score).toBeCloseTo(0.9, 5);
    expect(withDefaults.band).toBe("high");
    // Explanation is richer (params were explicitly supplied) but the score/band are unaffected.
    expect(withDefaults.explanation).toContain("Sources:");
    expect(withDefaults.explanation).toContain("Evidence quality 0.50");
  });

  it("high evidenceQuality (1.0) raises the score by the full +0.15 bonus", () => {
    const ev = evidence(4);
    const freq = frequency(2, 2);
    const baseline = computeClusterConfidence(ev, freq); // rawScore 0.5, no adjustment
    const withHighQuality = computeClusterConfidence(ev, freq, 1.0, 0);
    expect(withHighQuality.score).toBeCloseTo(baseline.score + 0.15, 5);
  });

  it("low evidenceQuality (0.0) lowers the score by the full -0.15 penalty", () => {
    const ev = evidence(4);
    const freq = frequency(2, 2);
    const baseline = computeClusterConfidence(ev, freq);
    const withLowQuality = computeClusterConfidence(ev, freq, 0.0, 0);
    expect(withLowQuality.score).toBeCloseTo(baseline.score - 0.15, 5);
  });

  it("a high duplicateRatio (1.0) lowers the score by the full -0.3 penalty and is cited in the explanation", () => {
    const ev = evidence(4);
    const freq = frequency(2, 2);
    const baseline = computeClusterConfidence(ev, freq);
    const withDuplicates = computeClusterConfidence(ev, freq, 0.5, 1.0);
    // 0.5 evidenceQuality is neutral (0 adjustment); duplicateRatio=1.0 -> -0.3 penalty.
    expect(withDuplicates.score).toBeCloseTo(Math.max(0, baseline.score - 0.3), 5);
    expect(withDuplicates.explanation).toContain("near-duplicate(s) discounted");
    expect(withDuplicates.explanation).toContain("duplicateRatio 1.00");
  });

  it("score is clamped to [0, 1] even when adjustments would push it out of range", () => {
    const ev = evidence(20);
    const freq = frequency(5, 10); // would already be high before adjustments
    const result = computeClusterConfidence(ev, freq, 1.0, 0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("richer explanation cites real source names from evidence.sourceBreakdown", () => {
    const ev: ClusterEvidence = {
      evidenceCount: 5,
      sourceBreakdown: { github: 2, reddit: 2, hackernews: 1 },
      originalUrls: [],
      representativeExamples: [],
      engagementTotal: 0,
      dateRange: null,
    };
    const freq = frequency(3, 4);
    const result = computeClusterConfidence(ev, freq, 0.68, 0.2);
    expect(result.explanation).toContain("Sources: github, hackernews, reddit");
    expect(result.explanation).toContain("Evidence quality 0.68");
    // duplicateRatio 0.2 * evidenceCount 5 = 1 near-duplicate discounted.
    expect(result.explanation).toContain("~1 near-duplicate(s) discounted (duplicateRatio 0.20)");
  });
});
