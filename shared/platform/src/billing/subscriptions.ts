import { getPlatformDb, currentAppId } from "../db/index.js";
import { conflictError, notFoundError } from "../errors/index.js";
import { recordAuditLogEntry } from "../audit/index.js";
import { getPlanByCode } from "./plans.js";
import type { CreateSubscriptionInput } from "./validation.js";

const DEFAULT_TRIAL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function periodEndFor(start: Date, interval: "monthly" | "yearly"): Date {
  const end = new Date(start);
  if (interval === "monthly") end.setMonth(end.getMonth() + 1);
  else end.setFullYear(end.getFullYear() + 1);
  return end;
}

/**
 * Every org gets exactly one active subscription per product (app_id) —
 * created at signup, trialing by default, per every product's
 * PRODUCT_IDENTITY.md §24 "Billing States" table.
 */
export async function createSubscription(input: CreateSubscriptionInput) {
  const db = getPlatformDb();
  const appId = currentAppId();

  const existing = await db.subscription.findUnique({
    where: { uq_subscriptions_org_app: { organizationId: input.organizationId, appId } },
  });
  if (existing) throw conflictError("This organization already has a subscription for this product.");

  const plan = await getPlanByCode(input.planCode, input.billingInterval);
  const now = new Date();
  const trialDays = input.trialDays ?? DEFAULT_TRIAL_DAYS;
  const trialEndsAt = trialDays > 0 ? new Date(now.getTime() + trialDays * DAY_MS) : undefined;

  const subscription = await db.subscription.create({
    data: {
      appId,
      organizationId: input.organizationId,
      planId: plan.id,
      status: "trialing",
      currentPeriodStart: now,
      currentPeriodEnd: trialEndsAt ?? periodEndFor(now, input.billingInterval),
      trialEndsAt,
    },
  });

  await recordAuditLogEntry({
    organizationId: input.organizationId,
    action: "subscription.created",
    targetType: "subscription",
    targetId: subscription.id,
    metadata: { planCode: input.planCode, billingInterval: input.billingInterval },
  });

  return subscription;
}

export async function getSubscriptionForOrganization(organizationId: string) {
  return getPlatformDb().subscription.findUnique({
    where: { uq_subscriptions_org_app: { organizationId, appId: currentAppId() } },
    include: { plan: true },
  });
}

/** Called from the Stripe webhook handler once payment succeeds — trial converts to active, or a canceled/past_due sub reactivates. */
export async function activateSubscription(params: { organizationId: string; stripeCustomerId: string; stripeSubscriptionId: string }) {
  const db = getPlatformDb();
  const subscription = await db.subscription.findUnique({
    where: { uq_subscriptions_org_app: { organizationId: params.organizationId, appId: currentAppId() } },
  });
  if (!subscription) throw notFoundError("Subscription");

  const updated = await db.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "active",
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.stripeSubscriptionId,
      pastDueSince: null,
    },
  });

  await recordAuditLogEntry({
    organizationId: params.organizationId,
    action: "subscription.activated",
    targetType: "subscription",
    targetId: subscription.id,
  });

  return updated;
}

/** Changes plan (upgrade or downgrade) — takes effect immediately per every product's "limit increases immediately on upgrade" rule; Stripe proration is handled by the caller's Stripe adapter call before this runs. */
export async function changePlan(params: { organizationId: string; newPlanCode: string; billingInterval: "monthly" | "yearly" }) {
  const db = getPlatformDb();
  const subscription = await db.subscription.findUnique({
    where: { uq_subscriptions_org_app: { organizationId: params.organizationId, appId: currentAppId() } },
  });
  if (!subscription) throw notFoundError("Subscription");

  const newPlan = await getPlanByCode(params.newPlanCode, params.billingInterval);

  const updated = await db.subscription.update({
    where: { id: subscription.id },
    data: { planId: newPlan.id },
  });

  await recordAuditLogEntry({
    organizationId: params.organizationId,
    action: "subscription.plan_changed",
    targetType: "subscription",
    targetId: subscription.id,
    metadata: { newPlanCode: params.newPlanCode },
  });

  return updated;
}

export async function markPastDue(organizationId: string): Promise<void> {
  const db = getPlatformDb();
  const subscription = await db.subscription.findUnique({
    where: { uq_subscriptions_org_app: { organizationId, appId: currentAppId() } },
  });
  if (!subscription) throw notFoundError("Subscription");

  await db.subscription.update({
    where: { id: subscription.id },
    data: { status: "past_due", pastDueSince: new Date() },
  });

  await recordAuditLogEntry({ organizationId, action: "subscription.past_due", targetType: "subscription", targetId: subscription.id });
}

export async function cancelSubscription(params: { organizationId: string; atPeriodEnd: boolean }): Promise<void> {
  const db = getPlatformDb();
  const subscription = await db.subscription.findUnique({
    where: { uq_subscriptions_org_app: { organizationId: params.organizationId, appId: currentAppId() } },
  });
  if (!subscription) throw notFoundError("Subscription");

  await db.subscription.update({
    where: { id: subscription.id },
    data: params.atPeriodEnd
      ? { cancelAtPeriodEnd: true }
      : { status: "canceled", canceledAt: new Date(), cancelAtPeriodEnd: false },
  });

  await recordAuditLogEntry({
    organizationId: params.organizationId,
    action: params.atPeriodEnd ? "subscription.cancellation_scheduled" : "subscription.canceled",
    targetType: "subscription",
    targetId: subscription.id,
  });
}

/** Rolls a subscription into its next billing period — called by the Stripe webhook on `invoice.paid` for the renewal cycle. */
export async function renewSubscriptionPeriod(params: { organizationId: string; billingInterval: "monthly" | "yearly" }): Promise<void> {
  const db = getPlatformDb();
  const subscription = await db.subscription.findUnique({
    where: { uq_subscriptions_org_app: { organizationId: params.organizationId, appId: currentAppId() } },
  });
  if (!subscription) throw notFoundError("Subscription");

  const newStart = subscription.currentPeriodEnd;
  const newEnd = periodEndFor(newStart, params.billingInterval);

  if (subscription.cancelAtPeriodEnd) {
    await db.subscription.update({ where: { id: subscription.id }, data: { status: "canceled", canceledAt: new Date() } });
    return;
  }

  await db.subscription.update({
    where: { id: subscription.id },
    data: { currentPeriodStart: newStart, currentPeriodEnd: newEnd, trialEndsAt: null },
  });
}
