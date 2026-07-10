import { describe, expect, it } from "vitest";
import { summarizeDashboard } from "../../lib/services/dashboard.js";

describe("summarizeDashboard", () => {
  it("counts open findings, critical open, and SoD violations", () => {
    const summary = summarizeDashboard([
      { status: "open", severity: "critical", category: "sod_violation" },
      { status: "open", severity: "medium", category: "config_error" },
      { status: "resolved", severity: "critical", category: "sod_violation" },
    ]);
    expect(summary.openFindingCount).toBe(2);
    expect(summary.criticalOpenCount).toBe(1);
    expect(summary.sodViolationCount).toBe(1);
    expect(summary.totalFindingCount).toBe(3);
  });

  it("returns zeroed summary for no findings", () => {
    const summary = summarizeDashboard([]);
    expect(summary.openFindingCount).toBe(0);
    expect(summary.sodViolationCount).toBe(0);
  });
});
