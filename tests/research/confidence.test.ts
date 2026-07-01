import { describe, expect, it, vi } from "vitest";
import { computeResearchConfidence } from "../../src/research/confidence.js";
import { RealityGuard } from "../../src/intelligence/reality-guard.js";
import { makeInsight } from "../../src/intelligence/reality-guard.js";

describe("computeResearchConfidence", () => {
  it("invokes RealityGuard.recalibrate rather than reimplementing its logic", () => {
    const spy = vi.spyOn(RealityGuard.prototype, "recalibrate");
    const insight = makeInsight({
      topic: "topic",
      finding: { x: 1 },
      reportedBy: "test",
      confidence: "high",
      sources: [{ title: "s1", kind: "primary", fetchedAt: new Date().toISOString() }],
    });

    computeResearchConfidence(2, 2, insight);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(insight);
    spy.mockRestore();
  });

  it("multiplies the recalibrated confidence by full coverage ratio (1.0) when all eligible sources succeed", () => {
    const insight = makeInsight({
      topic: "topic",
      finding: {},
      reportedBy: "test",
      confidence: "medium",
      sources: [
        { title: "s1", kind: "primary", fetchedAt: new Date().toISOString() },
        { title: "s2", kind: "primary", fetchedAt: new Date().toISOString() },
      ],
    });
    const result = computeResearchConfidence(3, 3, insight);
    // medium confidence stays medium (2 primary sources), coverage ratio 1.0
    expect(result.numericScore).toBeCloseTo(0.66, 2);
    expect(result.band).toBe("medium");
  });

  it("discounts the score proportionally to coverage ratio", () => {
    const insight = makeInsight({
      topic: "topic",
      finding: {},
      reportedBy: "test",
      confidence: "medium",
      sources: [
        { title: "s1", kind: "primary", fetchedAt: new Date().toISOString() },
        { title: "s2", kind: "primary", fetchedAt: new Date().toISOString() },
      ],
    });
    const fullCoverage = computeResearchConfidence(4, 4, insight);
    const halfCoverage = computeResearchConfidence(2, 4, insight);
    expect(halfCoverage.numericScore).toBeLessThan(fullCoverage.numericScore);
    expect(halfCoverage.numericScore).toBeCloseTo(fullCoverage.numericScore / 2, 2);
  });

  it("caps the coverage ratio at 1.0 even if usedCount exceeds eligibleCount", () => {
    const insight = makeInsight({
      topic: "topic",
      finding: {},
      reportedBy: "test",
      confidence: "low",
      sources: [],
    });
    const result = computeResearchConfidence(5, 2, insight);
    expect(result.numericScore).toBeLessThanOrEqual(0.33);
  });

  it("returns zero score when there are no eligible sources", () => {
    const insight = makeInsight({ topic: "t", finding: {}, reportedBy: "test", confidence: "high" });
    const result = computeResearchConfidence(0, 0, insight);
    expect(result.numericScore).toBe(0);
    expect(result.band).toBe("low");
  });

  it("downgrades high confidence with insufficient primary sources before applying coverage (delegated to RealityGuard)", () => {
    const insight = makeInsight({
      topic: "topic",
      finding: {},
      reportedBy: "test",
      confidence: "high",
      sources: [{ title: "s1", kind: "secondary", fetchedAt: new Date().toISOString() }],
    });
    // RealityGuard.recalibrate cascades high -> medium -> low here (0 primary sources,
    // fewer than 2 sources total) — confirms confidence.ts defers entirely to the guard.
    const result = computeResearchConfidence(1, 1, insight);
    expect(result.band).toBe("low");
    expect(result.numericScore).toBeCloseTo(0.33, 2);
  });
});
