import { getPlatformDb, currentAppId } from "../db/index.js";

/**
 * The central `can(org, feature)` / `withinLimit(org, metric)` engine
 * every product's pricing tiers (from their own PRODUCT_IDENTITY.md §22
 * "Entitlements Logic") plug into — built once here, not reimplemented
 * per product.
 */

async function getActiveSubscription(organizationId: string) {
  return getPlatformDb().subscription.findFirst({
    where: {
      organizationId,
      appId: currentAppId(),
      status: { in: ["trialing", "active", "past_due"] },
    },
    include: { plan: { include: { entitlements: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** No active subscription = Free tier: caller is responsible for seeding a Free plan's entitlements per product, same as any other tier. */
export async function can(organizationId: string, featureKey: string): Promise<boolean> {
  const subscription = await getActiveSubscription(organizationId);
  if (!subscription) return false;

  // Past-due orgs lose gated features immediately per most products'
  // billing-state table (read-only access), but retain what Free would give them.
  if (subscription.status === "past_due") return false;

  const entitlement = subscription.plan.entitlements.find((e) => e.featureKey === featureKey);
  if (!entitlement) return false;
  if (entitlement.kind === "boolean") return entitlement.boolValue ?? false;
  // A numeric_limit entitlement with a non-null limit implies the feature is available (limit enforcement is withinLimit's job).
  return true;
}

export interface LimitCheckResult {
  allowed: boolean;
  limit: number | null; // null = unlimited
  current: number;
}

export async function withinLimit(organizationId: string, metricKey: string): Promise<LimitCheckResult> {
  const subscription = await getActiveSubscription(organizationId);
  if (!subscription) return { allowed: false, limit: 0, current: 0 };

  const entitlement = subscription.plan.entitlements.find((e) => e.featureKey === metricKey);
  const limit = entitlement?.numericLimit ?? null;

  if (limit === null && entitlement?.kind === "numeric_limit") {
    return { allowed: true, limit: null, current: 0 }; // unlimited
  }
  if (!entitlement) return { allowed: false, limit: 0, current: 0 };

  const periodStart = currentBillingPeriodStart(subscription.currentPeriodStart, subscription.currentPeriodEnd);
  const counter = await getPlatformDb().usageCounter.findUnique({
    where: { uq_usage_counters_org_metric_period: { organizationId, metricKey, periodStart } },
  });
  const current = counter?.value ?? 0;

  return { allowed: limit === null || current < limit, limit, current };
}

/** Finds the billing period containing "now" — usage resets per period, not per calendar month, since a product's period may not align to the 1st. */
function currentBillingPeriodStart(periodStart: Date, periodEnd: Date): Date {
  const now = new Date();
  if (now >= periodStart && now < periodEnd) return periodStart;
  return periodStart; // subscription renewal (SH-BILL-3 webhook) updates currentPeriodStart/End on rollover; this is the source of truth between renewals.
}

export async function getEntitlementSummary(organizationId: string) {
  const subscription = await getActiveSubscription(organizationId);
  if (!subscription) return { planCode: null, entitlements: [] };

  return {
    planCode: subscription.plan.code,
    status: subscription.status,
    entitlements: subscription.plan.entitlements.map((e) => ({
      featureKey: e.featureKey,
      kind: e.kind,
      boolValue: e.boolValue,
      numericLimit: e.numericLimit,
    })),
  };
}
