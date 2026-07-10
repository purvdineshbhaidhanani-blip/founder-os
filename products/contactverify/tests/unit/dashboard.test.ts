import { describe, expect, it } from "vitest";
import { summarizeDashboard } from "../../lib/services/dashboard.js";

describe("summarizeDashboard", () => {
  it("counts verified and invalid contacts", () => {
    const summary = summarizeDashboard([
      { emailStatus: "valid", healthScore: 90 },
      { emailStatus: "invalid", healthScore: 10 },
      { emailStatus: "risky", healthScore: 50 },
    ]);
    expect(summary.totalContacts).toBe(3);
    expect(summary.verifiedContacts).toBe(1);
    expect(summary.invalidContacts).toBe(1);
    expect(summary.averageHealthScore).toBe(50);
  });

  it("returns zeroed summary for no contacts", () => {
    const summary = summarizeDashboard([]);
    expect(summary.totalContacts).toBe(0);
    expect(summary.averageHealthScore).toBe(0);
  });
});
