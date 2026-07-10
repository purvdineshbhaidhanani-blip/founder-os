export interface DashboardSubscription {
  category: string;
  kind: "saas" | "ai_tool";
  monthlyCostCents: number;
  status: string;
}

export interface CategorySpend {
  category: string;
  monthlyCostCents: number;
  subscriptionCount: number;
}

export interface DashboardSummary {
  totalMonthlySpendCents: number;
  saasMonthlySpendCents: number;
  aiToolMonthlySpendCents: number;
  activeSubscriptionCount: number;
  spendByCategory: CategorySpend[];
}

/**
 * Spend dashboard aggregation per
 * products/spendgov/docs/PRODUCT_IDENTITY.md §18 "Spend dashboard: total
 * spend by category... with trends." Trend-over-time requires periodic
 * spend snapshots this Phase-1 schema doesn't yet capture (each
 * subscription row holds current cost only, not a cost history) — this
 * function reports current totals; a `SpendSnapshot` table capturing a
 * point-in-time read each billing period is the natural follow-up once a
 * scheduled job can populate it, tracked as known future work rather than
 * faked with placeholder trend data.
 */
export function summarizeDashboard(subscriptions: DashboardSubscription[]): DashboardSummary {
  const active = subscriptions.filter((s) => s.status === "active");

  const byCategory = new Map<string, CategorySpend>();
  for (const sub of active) {
    const existing = byCategory.get(sub.category) ?? { category: sub.category, monthlyCostCents: 0, subscriptionCount: 0 };
    existing.monthlyCostCents += sub.monthlyCostCents;
    existing.subscriptionCount += 1;
    byCategory.set(sub.category, existing);
  }

  return {
    totalMonthlySpendCents: active.reduce((sum, s) => sum + s.monthlyCostCents, 0),
    saasMonthlySpendCents: active.filter((s) => s.kind === "saas").reduce((sum, s) => sum + s.monthlyCostCents, 0),
    aiToolMonthlySpendCents: active.filter((s) => s.kind === "ai_tool").reduce((sum, s) => sum + s.monthlyCostCents, 0),
    activeSubscriptionCount: active.length,
    spendByCategory: [...byCategory.values()].sort((a, b) => b.monthlyCostCents - a.monthlyCostCents),
  };
}
