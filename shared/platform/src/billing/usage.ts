import { getPlatformDb, currentAppId } from "../db/index.js";
import { notFoundError } from "../errors/index.js";
import type { IncrementUsageInput } from "./validation.js";

/**
 * Usage metering per standards/database.md's upsert-and-increment pattern
 * — every metered feature (AI spend tracking limits, scan counts, contact
 * verification volume, etc. across the 12 products) increments a counter
 * scoped to the org's *current subscription period*, not a calendar month,
 * so usage resets align with billing, not the 1st of the month.
 */
export async function incrementUsage(input: IncrementUsageInput): Promise<{ metricKey: string; value: number }> {
  const db = getPlatformDb();

  const subscription = await db.subscription.findFirst({
    where: { organizationId: input.organizationId, appId: currentAppId(), status: { in: ["trialing", "active", "past_due"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription) throw notFoundError("Active subscription");

  const counter = await db.usageCounter.upsert({
    where: {
      uq_usage_counters_org_metric_period: {
        organizationId: input.organizationId,
        metricKey: input.metricKey,
        periodStart: subscription.currentPeriodStart,
      },
    },
    create: {
      organizationId: input.organizationId,
      metricKey: input.metricKey,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      value: input.amount,
    },
    update: {
      value: { increment: input.amount },
    },
  });

  return { metricKey: counter.metricKey, value: counter.value };
}

export async function getCurrentUsage(organizationId: string, metricKey: string): Promise<number> {
  const db = getPlatformDb();
  const subscription = await db.subscription.findFirst({
    where: { organizationId, appId: currentAppId(), status: { in: ["trialing", "active", "past_due"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription) return 0;

  const counter = await db.usageCounter.findUnique({
    where: { uq_usage_counters_org_metric_period: { organizationId, metricKey, periodStart: subscription.currentPeriodStart } },
  });
  return counter?.value ?? 0;
}

/** Resets a specific metric's counter for the current period — used for manual corrections/support tooling, not the normal renewal path (which naturally starts a fresh period). */
export async function resetUsage(organizationId: string, metricKey: string): Promise<void> {
  const db = getPlatformDb();
  const subscription = await db.subscription.findFirst({
    where: { organizationId, appId: currentAppId(), status: { in: ["trialing", "active", "past_due"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!subscription) throw notFoundError("Active subscription");

  await db.usageCounter.upsert({
    where: { uq_usage_counters_org_metric_period: { organizationId, metricKey, periodStart: subscription.currentPeriodStart } },
    create: {
      organizationId,
      metricKey,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      value: 0,
    },
    update: { value: 0 },
  });
}
