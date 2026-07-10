import { createPlan, setPlanEntitlement, getPlanByCode } from "@founder-os/platform/billing";
import { createSubscription as createBillingSubscription, getSubscriptionForOrganization } from "@founder-os/platform/billing";
import { can, withinLimit } from "@founder-os/platform/billing";

/**
 * Pricing tiers per products/incidenttriage/docs/PRODUCT_IDENTITY.md
 * §21-22 — Free/Starter/Pro/Enterprise, entitlements transcribed
 * verbatim from the "Entitlements Logic (Pricing Engine)" table.
 */
export const PLAN_DEFINITIONS = [
  {
    code: "free",
    name: "Free",
    priceCents: 0,
    booleans: {
      use_ai_incident_copilot: false,
      use_ai_recovery_suggestions: false,
      use_advanced_analytics: false,
      use_custom_dashboards: false,
      use_api: false,
      use_status_page_integration: false,
      use_sso: false,
      use_scim: false,
    },
    limits: { projects: 1, team_members: 2, incidents_monthly: 100, ai_root_cause_analyses_monthly: 5, history_days: 7 },
  },
  {
    code: "starter",
    name: "Starter",
    priceCents: 3900,
    booleans: {
      use_ai_incident_copilot: false,
      use_ai_recovery_suggestions: false,
      use_advanced_analytics: false,
      use_custom_dashboards: false,
      use_api: false,
      use_status_page_integration: false,
      use_sso: false,
      use_scim: false,
    },
    limits: { projects: 5, team_members: 10, incidents_monthly: 1000, ai_root_cause_analyses_monthly: null, history_days: 90 },
  },
  {
    code: "pro",
    name: "Pro",
    priceCents: 14900,
    booleans: {
      use_ai_incident_copilot: true,
      use_ai_recovery_suggestions: true,
      use_advanced_analytics: true,
      use_custom_dashboards: true,
      use_api: true,
      use_status_page_integration: true,
      use_sso: false,
      use_scim: false,
    },
    limits: { projects: null, team_members: null, incidents_monthly: null, ai_root_cause_analyses_monthly: null, history_days: 730 },
  },
  {
    code: "enterprise",
    name: "Enterprise",
    priceCents: 0,
    booleans: {
      use_ai_incident_copilot: true,
      use_ai_recovery_suggestions: true,
      use_advanced_analytics: true,
      use_custom_dashboards: true,
      use_api: true,
      use_status_page_integration: true,
      use_sso: true,
      use_scim: true,
    },
    limits: { projects: null, team_members: null, incidents_monthly: null, ai_root_cause_analyses_monthly: null, history_days: null },
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
