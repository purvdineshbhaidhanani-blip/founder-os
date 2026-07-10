import { describe, expect, it } from "vitest";
import { summarizeDashboard } from "../../lib/services/dashboard.js";

describe("summarizeDashboard", () => {
  it("counts open and investigating incidents as open", () => {
    const summary = summarizeDashboard([
      { status: "open", severity: "critical" },
      { status: "investigating", severity: "warning" },
      { status: "resolved", severity: "info" },
    ]);
    expect(summary.openIncidentCount).toBe(2);
    expect(summary.criticalOpenCount).toBe(1);
    expect(summary.totalIncidentCount).toBe(3);
  });

  it("buckets incidents by severity across all statuses", () => {
    const summary = summarizeDashboard([
      { status: "resolved", severity: "critical" },
      { status: "open", severity: "critical" },
      { status: "open", severity: "warning" },
    ]);
    expect(summary.incidentsBySeverity).toEqual({ critical: 2, warning: 1 });
  });

  it("returns zeroed summary for no incidents", () => {
    const summary = summarizeDashboard([]);
    expect(summary.openIncidentCount).toBe(0);
    expect(summary.incidentsBySeverity).toEqual({});
  });
});
