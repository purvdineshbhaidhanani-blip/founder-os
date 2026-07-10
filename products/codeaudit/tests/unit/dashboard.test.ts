import { describe, expect, it } from "vitest";
import { averageHealthScore, summarizeDashboard } from "../../lib/services/dashboard.js";

describe("summarizeDashboard", () => {
  it("counts only open findings toward openFindingCount", () => {
    const summary = summarizeDashboard([
      { severity: "critical", status: "open", category: "vulnerability" },
      { severity: "high", status: "fixed", category: "vulnerability" },
      { severity: "low", status: "false_positive", category: "quality" },
    ]);
    expect(summary.openFindingCount).toBe(1);
    expect(summary.totalFindingCount).toBe(3);
    expect(summary.criticalOpenCount).toBe(1);
    expect(summary.highOpenCount).toBe(0);
  });

  it("buckets findings by category across all statuses", () => {
    const summary = summarizeDashboard([
      { severity: "high", status: "open", category: "secret" },
      { severity: "medium", status: "fixed", category: "secret" },
      { severity: "low", status: "open", category: "quality" },
    ]);
    expect(summary.findingsByCategory).toEqual({ secret: 2, quality: 1 });
  });

  it("returns zeroed summary for no findings", () => {
    const summary = summarizeDashboard([]);
    expect(summary.openFindingCount).toBe(0);
    expect(summary.totalFindingCount).toBe(0);
    expect(summary.findingsByCategory).toEqual({});
  });
});

describe("averageHealthScore", () => {
  it("returns 100 when there are no scans", () => {
    expect(averageHealthScore([])).toBe(100);
  });

  it("averages and rounds scores", () => {
    expect(averageHealthScore([90, 81])).toBe(86);
  });
});
