import { describe, expect, it } from "vitest";
import { summarizeDashboard } from "../../lib/services/dashboard.js";

describe("summarizeDashboard", () => {
  it("computes average consistency score and drift count", () => {
    const summary = summarizeDashboard([
      { consistencyScore: 100, driftWarnings: [] },
      { consistencyScore: 75, driftWarnings: ["hair color mismatch"] },
    ]);
    expect(summary.totalGenerations).toBe(2);
    expect(summary.averageConsistencyScore).toBe(88);
    expect(summary.generationsWithDrift).toBe(1);
  });

  it("returns 100 average for no generations", () => {
    const summary = summarizeDashboard([]);
    expect(summary.averageConsistencyScore).toBe(100);
    expect(summary.totalGenerations).toBe(0);
  });
});
