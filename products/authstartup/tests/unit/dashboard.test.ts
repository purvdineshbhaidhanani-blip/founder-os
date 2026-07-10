import { describe, expect, it } from "vitest";
import { summarizeDashboard } from "../../lib/services/dashboard.js";

describe("summarizeDashboard", () => {
  it("counts only open findings", () => {
    const summary = summarizeDashboard([
      { status: "open", severity: "high" },
      { status: "resolved", severity: "high" },
      { status: "open", severity: "low" },
    ]);
    expect(summary.openFindingCount).toBe(2);
    expect(summary.highOpenCount).toBe(1);
    expect(summary.totalFindingCount).toBe(3);
  });

  it("returns zeroed summary for no findings", () => {
    const summary = summarizeDashboard([]);
    expect(summary.openFindingCount).toBe(0);
    expect(summary.highOpenCount).toBe(0);
  });
});
