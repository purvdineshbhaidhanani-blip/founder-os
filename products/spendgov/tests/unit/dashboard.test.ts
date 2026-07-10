import { describe, expect, it } from "vitest";
import { summarizeDashboard } from "../../lib/services/dashboard.js";

describe("summarizeDashboard", () => {
  it("splits total spend by SaaS vs. AI tool kind", () => {
    const summary = summarizeDashboard([
      { category: "project_management", kind: "saas", monthlyCostCents: 100_00, status: "active" },
      { category: "ai_infra", kind: "ai_tool", monthlyCostCents: 50_00, status: "active" },
    ]);
    expect(summary.totalMonthlySpendCents).toBe(150_00);
    expect(summary.saasMonthlySpendCents).toBe(100_00);
    expect(summary.aiToolMonthlySpendCents).toBe(50_00);
  });

  it("groups active spend by category, largest first", () => {
    const summary = summarizeDashboard([
      { category: "communication", kind: "saas", monthlyCostCents: 20_00, status: "active" },
      { category: "analytics", kind: "saas", monthlyCostCents: 200_00, status: "active" },
    ]);
    expect(summary.spendByCategory.map((c) => c.category)).toEqual(["analytics", "communication"]);
  });

  it("excludes canceled subscriptions from totals", () => {
    const summary = summarizeDashboard([{ category: "analytics", kind: "saas", monthlyCostCents: 200_00, status: "canceled" }]);
    expect(summary.totalMonthlySpendCents).toBe(0);
    expect(summary.activeSubscriptionCount).toBe(0);
  });
});
