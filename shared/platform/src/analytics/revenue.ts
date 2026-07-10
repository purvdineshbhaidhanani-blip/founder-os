import { getPlatformDb, currentAppId } from "../db/index.js";

/**
 * Revenue metrics computed directly from SH-BILL's Subscription/Plan data
 * — one definition per metric, per frameworks/17-success-metrics.md,
 * rather than every product computing MRR slightly differently.
 */
export async function calculateMRR(): Promise<number> {
  const activeSubscriptions = await getPlatformDb().subscription.findMany({
    where: { appId: currentAppId(), status: "active" },
    include: { plan: true },
  });

  const monthlyCents = activeSubscriptions.reduce((sum, sub) => {
    const monthlyEquivalent = sub.plan.billingInterval === "yearly" ? sub.plan.priceCents / 12 : sub.plan.priceCents;
    return sum + monthlyEquivalent;
  }, 0);

  return monthlyCents / 100;
}

export async function calculateARR(): Promise<number> {
  const mrr = await calculateMRR();
  return mrr * 12;
}

export interface ChurnResult {
  churnedCount: number;
  activeAtStartCount: number;
  churnRate: number;
}

export async function calculateChurnRate(params: { since: Date; until: Date }): Promise<ChurnResult> {
  const db = getPlatformDb();
  const appId = currentAppId();

  const activeAtStart = await db.subscription.count({
    where: { appId, status: { in: ["active", "past_due"] }, createdAt: { lt: params.since } },
  });

  const churned = await db.subscription.count({
    where: { appId, status: "canceled", canceledAt: { gte: params.since, lte: params.until } },
  });

  return {
    churnedCount: churned,
    activeAtStartCount: activeAtStart,
    churnRate: activeAtStart === 0 ? 0 : churned / activeAtStart,
  };
}
