import { describe, expect, it } from "vitest";
import { summarizeDashboard, type DashboardFinding } from "../../lib/services/dashboard.js";

describe("summarizeDashboard", () => {
  it("counts only open findings for the headline metrics but all findings for the total", () => {
    const findings: DashboardFinding[] = [
      { status: "open", severity: "critical", category: "tax_withholding" },
      { status: "open", severity: "medium", category: "attendance_mismatch" },
      { status: "resolved", severity: "high", category: "salary_calculation" },
    ];
    const summary = summarizeDashboard(findings);
    expect(summary.openFindingCount).toBe(2);
    expect(summary.criticalOpenCount).toBe(1);
    expect(summary.taxFindingCount).toBe(1);
    expect(summary.attendanceFindingCount).toBe(1);
    expect(summary.totalFindingCount).toBe(3);
  });

  it("returns all zeros for no findings", () => {
    const summary = summarizeDashboard([]);
    expect(summary).toEqual({ openFindingCount: 0, criticalOpenCount: 0, taxFindingCount: 0, attendanceFindingCount: 0, totalFindingCount: 0 });
  });
});
