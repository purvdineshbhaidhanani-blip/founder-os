import { describe, expect, it } from "vitest";
import { summarizeDashboard, type DashboardFinding } from "../../lib/services/dashboard.js";

describe("summarizeDashboard", () => {
  it("counts only open findings for the headline metrics but all findings for the total", () => {
    const findings: DashboardFinding[] = [
      { status: "open", severity: "high", category: "terminology" },
      { status: "open", severity: "medium", category: "speaker_attribution" },
      { status: "resolved", severity: "high", category: "terminology" },
    ];
    const summary = summarizeDashboard(findings);
    expect(summary.openFindingCount).toBe(2);
    expect(summary.terminologyFindingCount).toBe(1);
    expect(summary.speakerFindingCount).toBe(1);
    expect(summary.totalFindingCount).toBe(3);
  });

  it("returns all zeros for no findings", () => {
    expect(summarizeDashboard([])).toEqual({ openFindingCount: 0, terminologyFindingCount: 0, speakerFindingCount: 0, totalFindingCount: 0 });
  });
});
