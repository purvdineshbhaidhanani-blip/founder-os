import { createPlan, setPlanEntitlement, getPlanByCode } from "@founder-os/platform/billing";
import { createSubscription as createBillingSubscription, getSubscriptionForOrganization } from "@founder-os/platform/billing";
import { can, withinLimit } from "@founder-os/platform/billing";

/**
 * Pricing tiers per products/erpaudit/docs/PRODUCT_IDENTITY.md §21-22 —
 * Free/Starter/Pro/Business/Enterprise, entitlements transcribed verbatim from
 * the "Entitlements Logic (Pricing Engine)" table, updated per the portfolio-wide
 * COMMERCIAL_FREEZE.md (Business tier inserted, Pro-tier `null` limits capped,
 * AI ERP Auditor moved Pro-only → Starter+ and metered via `ai_credits_monthly`).
 */
export const PLAN_DEFINITIONS = [
  {
    code: "free",
    name: "Free",
    priceCents: 0,
    booleans: {
      use_ai_summary: false,
      use_ai_risk_detection: false,
      use_sod_checks: false,
      use_process_validation: false,
      use_approval_workflows: false,
      use_multi_company: false,
      use_api: false,
      use_sso: false,
      use_scim: false,
    },
    limits: { erp_instances: 1, users: 2, configuration_scans_monthly: 5, history_days: 7, ai_credits_monthly: 0 },
  },
  {
    code: "starter",
    name: "Starter",
    priceCents: 4900,
    booleans: {
      use_ai_summary: true,
      use_ai_risk_detection: true,
      use_sod_checks: true,
      use_process_validation: true,
      use_approval_workflows: false,
      use_multi_company: false,
      use_api: false,
      use_sso: false,
      use_scim: false,
    },
    limits: { erp_instances: 5, users: 10, configuration_scans_monthly: 100, history_days: 90, ai_credits_monthly: 10 },
  },
  {
    code: "pro",
    name: "Pro",
    priceCents: 14900,
    booleans: {
      use_ai_summary: true,
      use_ai_risk_detection: true,
      use_sod_checks: true,
      use_process_validation: true,
      use_approval_workflows: true,
      use_multi_company: true,
      use_api: true,
      use_sso: false,
      use_scim: false,
    },
    limits: { erp_instances: 25, users: 50, configuration_scans_monthly: 500, history_days: 730, ai_credits_monthly: 80 },
  },
  {
    code: "business",
    name: "Business",
    priceCents: 34900,
    booleans: {
      use_ai_summary: true,
      use_ai_risk_detection: true,
      use_sod_checks: true,
      use_process_validation: true,
      use_approval_workflows: true,
      use_multi_company: true,
      use_api: true,
      use_sso: false,
      use_scim: false,
    },
    limits: { erp_instances: 100, users: 200, configuration_scans_monthly: 2000, history_days: 1825, ai_credits_monthly: 240 },
  },
  {
    code: "enterprise",
    name: "Enterprise",
    priceCents: 0,
    booleans: {
      use_ai_summary: true,
      use_ai_risk_detection: true,
      use_sod_checks: true,
      use_process_validation: true,
      use_approval_workflows: true,
      use_multi_company: true,
      use_api: true,
      use_sso: true,
      use_scim: true,
    },
    limits: { erp_instances: null, users: null, configuration_scans_monthly: null, history_days: null, ai_credits_monthly: null },
  },
] as const;

/** Idempotent: skips a plan that already exists, called from prisma/seed.ts. */
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

/** Every new organization starts on a 14-day trial with full Pro entitlements, per the universal billing-states rule. */
export async function startTrialSubscription(organizationId: string) {
  const existing = await getSubscriptionForOrganization(organizationId);
  if (existing) return existing;
  return createBillingSubscription({ organizationId, planCode: "pro", billingInterval: "monthly", trialDays: 14 });
}

export { can, withinLimit, getSubscriptionForOrganization };
