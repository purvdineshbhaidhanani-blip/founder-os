import { createPlan, setPlanEntitlement, getPlanByCode } from "@founder-os/platform/billing";
import { createSubscription as createBillingSubscription, getSubscriptionForOrganization } from "@founder-os/platform/billing";
import { can, withinLimit } from "@founder-os/platform/billing";

/**
 * Pricing tiers per products/seccorrelate/docs/PRODUCT_IDENTITY.md §21-22 —
 * Free/Starter/Pro/Business/Enterprise, entitlements transcribed verbatim
 * from the "Entitlements Logic (Pricing Engine)" table, extended per
 * COMMERCIAL_FREEZE.md §2 SECCORRELATE (Loop 2 commercial lock) with the
 * `business` tier and the `ai_credits_monthly` metering limit. AI
 * Investigate (`use_ai_incident_summary`) remains true on every plan
 * including Free, per Loop 1's "every plan" access — only the credit
 * allotment behind it changes.
 */
export const PLAN_DEFINITIONS = [
  {
    code: "free",
    name: "Free (14-Day Trial)",
    priceCents: 0,
    booleans: {
      use_ai_incident_summary: true,
      use_ai_correlation: false,
      view_incident_timeline: false,
      use_ai_threat_hunting: false,
      use_mitre_mapping: false,
      use_root_cause_analysis: false,
      use_playbooks: false,
      use_api: false,
      use_sso: false,
      multi_tenant: false,
    },
    limits: { integrations: 2, alert_ingestion_daily: 1000, ai_credits_monthly: 5 },
  },
  {
    code: "starter",
    name: "Starter",
    priceCents: 4900,
    booleans: {
      use_ai_incident_summary: true,
      use_ai_correlation: true,
      view_incident_timeline: true,
      use_ai_threat_hunting: false,
      use_mitre_mapping: false,
      use_root_cause_analysis: false,
      use_playbooks: false,
      use_api: false,
      use_sso: false,
      multi_tenant: false,
    },
    limits: { integrations: 10, alert_ingestion_daily: 50_000, ai_credits_monthly: 20 },
  },
  {
    code: "pro",
    name: "Pro",
    priceCents: 19900,
    booleans: {
      use_ai_incident_summary: true,
      use_ai_correlation: true,
      view_incident_timeline: true,
      use_ai_threat_hunting: true,
      use_mitre_mapping: true,
      use_root_cause_analysis: true,
      use_playbooks: true,
      use_api: true,
      use_sso: false,
      multi_tenant: false,
    },
    limits: { integrations: 25, alert_ingestion_daily: 250_000, ai_credits_monthly: 150 },
  },
  {
    code: "business",
    name: "Business",
    priceCents: 44900,
    booleans: {
      use_ai_incident_summary: true,
      use_ai_correlation: true,
      view_incident_timeline: true,
      use_ai_threat_hunting: true,
      use_mitre_mapping: true,
      use_root_cause_analysis: true,
      use_playbooks: true,
      use_api: true,
      use_sso: false,
      multi_tenant: false,
    },
    limits: { integrations: 100, alert_ingestion_daily: 1_000_000, ai_credits_monthly: 450 },
  },
  {
    code: "enterprise",
    name: "Enterprise",
    priceCents: 0,
    booleans: {
      use_ai_incident_summary: true,
      use_ai_correlation: true,
      view_incident_timeline: true,
      use_ai_threat_hunting: true,
      use_mitre_mapping: true,
      use_root_cause_analysis: true,
      use_playbooks: true,
      use_api: true,
      use_sso: true,
      multi_tenant: true,
    },
    limits: { integrations: null, alert_ingestion_daily: null, ai_credits_monthly: null },
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

/** Every new organization starts on a 14-day trial with full Pro entitlements, per §24 "Billing States". */
export async function startTrialSubscription(organizationId: string) {
  const existing = await getSubscriptionForOrganization(organizationId);
  if (existing) return existing;
  return createBillingSubscription({ organizationId, planCode: "pro", billingInterval: "monthly", trialDays: 14 });
}

export { can, withinLimit, getSubscriptionForOrganization };
