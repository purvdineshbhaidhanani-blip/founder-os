import { createPlan, setPlanEntitlement, getPlanByCode } from "@founder-os/platform/billing";
import { createSubscription as createBillingSubscription, getSubscriptionForOrganization } from "@founder-os/platform/billing";
import { can, withinLimit } from "@founder-os/platform/billing";

/**
 * Pricing tiers per products/spendgov/docs/PRODUCT_IDENTITY.md §21-22 —
 * Free/Starter/Pro/Enterprise, entitlements transcribed verbatim from the
 * "Entitlements Logic (Pricing Engine)" table. Enterprise has no
 * self-serve price (sold custom, per §21) so priceCents is 0 here; actual
 * Enterprise billing is a manually-provisioned subscription + custom
 * Stripe contract, never a self-serve checkout price.
 */
export const PLAN_DEFINITIONS = [
  {
    code: "free",
    name: "Free (14-Day Trial)",
    priceCents: 0,
    booleans: {
      detect_duplicates: false,
      use_ai_cfo_copilot: false,
      use_spend_optimization_ai: false,
      use_license_optimization: false,
      use_approval_workflows: false,
      use_api: false,
      use_forecasting: false,
      send_slack_alerts: false,
      use_sso: false,
      use_scim: false,
    },
    limits: { organizations: 1, saas_apps_tracked: 25, ai_tools_tracked: 10, history_days: 14 },
  },
  {
    code: "starter",
    name: "Starter",
    priceCents: 2900,
    booleans: {
      detect_duplicates: true,
      use_ai_cfo_copilot: false,
      use_spend_optimization_ai: false,
      use_license_optimization: false,
      use_approval_workflows: false,
      use_api: false,
      use_forecasting: false,
      send_slack_alerts: true,
      use_sso: false,
      use_scim: false,
    },
    limits: { organizations: 3, saas_apps_tracked: 100, ai_tools_tracked: null, history_days: 90 },
  },
  {
    code: "pro",
    name: "Pro",
    priceCents: 9900,
    booleans: {
      detect_duplicates: true,
      use_ai_cfo_copilot: true,
      use_spend_optimization_ai: true,
      use_license_optimization: true,
      use_approval_workflows: true,
      use_api: true,
      use_forecasting: true,
      send_slack_alerts: true,
      use_sso: false,
      use_scim: false,
    },
    limits: { organizations: null, saas_apps_tracked: null, ai_tools_tracked: null, history_days: 1095 },
  },
  {
    code: "enterprise",
    name: "Enterprise",
    priceCents: 0,
    booleans: {
      detect_duplicates: true,
      use_ai_cfo_copilot: true,
      use_spend_optimization_ai: true,
      use_license_optimization: true,
      use_approval_workflows: true,
      use_api: true,
      use_forecasting: true,
      send_slack_alerts: true,
      use_sso: true,
      use_scim: true,
    },
    limits: { organizations: null, saas_apps_tracked: null, ai_tools_tracked: null, history_days: null },
  },
] as const;

/** Idempotent: skips a plan that already exists (conflictError) so it's safe to re-run in every environment, called from prisma/seed.ts. */
export async function seedPlans(): Promise<void> {
  for (const definition of PLAN_DEFINITIONS) {
    let plan;
    try {
      plan = await createPlan({ code: definition.code, name: definition.name, billingInterval: "monthly", priceCents: definition.priceCents, currency: "usd" });
    } catch {
      plan = await getPlanByCode(definition.code, "monthly");
    }
    if (!plan) continue;

    for (const [featureKey, boolValue] of Object.entries(definition.booleans)) {
      await setPlanEntitlement(plan.id, { featureKey, kind: "boolean", boolValue });
    }
    for (const [metricKey, numericLimit] of Object.entries(definition.limits)) {
      await setPlanEntitlement(plan.id, { featureKey: metricKey, kind: "numeric_limit", numericLimit });
    }
  }
}

/**
 * Every new organization starts on a 14-day trial with full Pro-tier
 * entitlements, per §24 "Billing States": "Trialing (14 days) | Full Pro
 * features enabled." The trial is created against the "pro" plan
 * definition (not "free") specifically so the entitlements engine — which
 * keys off `subscription.plan`, not a separate "is trialing" flag — grants
 * Pro-level access for the duration. Auto-downgrading an expired,
 * card-less trial to Free per the same table's "unless card added" clause
 * requires a scheduled job (there is no in-process timer in this
 * serverless-friendly architecture, matching SH-REPORT's cron-worker
 * pattern) — tracked as follow-up work, not implemented in this pass.
 */
export async function startTrialSubscription(organizationId: string) {
  const existing = await getSubscriptionForOrganization(organizationId);
  if (existing) return existing;
  return createBillingSubscription({ organizationId, planCode: "pro", billingInterval: "monthly", trialDays: 14 });
}

export { can, withinLimit, getSubscriptionForOrganization };
