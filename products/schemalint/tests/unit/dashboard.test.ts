import { describe, expect, it } from "vitest";
import { summarizeDashboard, type DashboardFinding } from "../../lib/services/dashboard.js";

describe("summarizeDashboard", () => {
  it("counts only open findings for the headline metrics but all findings for the total", () => {
    const findings: DashboardFinding[] = [
      { status: "open", severity: "critical", category: "integrity" },
      { status: "open", severity: "high", category: "indexing" },
      { status: "resolved", severity: "critical", category: "integrity" },
    ];
    const summary = summarizeDashboard(findings);
    expect(summary.openFindingCount).toBe(2);
    expect(summary.criticalOpenCount).toBe(1);
    expect(summary.indexingFindingCount).toBe(1);
    expect(summary.integrityFindingCount).toBe(1);
    expect(summary.totalFindingCount).toBe(3);
  });

  it("returns all zeros for no findings", () => {
    expect(summarizeDashboard([])).toEqual({ openFindingCount: 0, criticalOpenCount: 0, indexingFindingCount: 0, integrityFindingCount: 0, totalFindingCount: 0 });
  });
});
