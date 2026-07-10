import { describe, expect, it } from "vitest";
import { summarizeDashboard } from "../../lib/services/dashboard.js";

describe("summarizeDashboard", () => {
  it("counts open and investigating alerts as open", () => {
    const summary = summarizeDashboard([
      { severity: "high", status: "open" },
      { severity: "medium", status: "investigating" },
      { severity: "low", status: "resolved" },
    ]);
    expect(summary.openAlertCount).toBe(2);
    expect(summary.totalAlertCount).toBe(3);
  });

  it("counts critical and high open alerts separately", () => {
    const summary = summarizeDashboard([
      { severity: "critical", status: "open" },
      { severity: "high", status: "open" },
      { severity: "high", status: "resolved" },
    ]);
    expect(summary.criticalOpenCount).toBe(1);
    expect(summary.highOpenCount).toBe(1);
  });

  it("groups all alerts by severity regardless of status", () => {
    const summary = summarizeDashboard([
      { severity: "critical", status: "resolved" },
      { severity: "critical", status: "open" },
      { severity: "low", status: "dismissed" },
    ]);
    expect(summary.alertsBySeverity).toEqual({ critical: 2, low: 1 });
  });
});
