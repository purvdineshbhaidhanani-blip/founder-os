import { createPlan, setPlanEntitlement, getPlanByCode } from "@founder-os/platform/billing";
import { createSubscription as createBillingSubscription, getSubscriptionForOrganization } from "@founder-os/platform/billing";
import { can, withinLimit } from "@founder-os/platform/billing";

/**
 * Pricing tiers per products/crmcapture/docs/PRODUCT_IDENTITY.md §21-22 —
 * Free/Starter/Pro/Enterprise, entitlements transcribed verbatim from the
 * "Entitlements Logic (Pricing Engine)" table. Per-user/seat pricing
 * (§21) is a Phase 2 metering/invoicing concern; Phase 1 tracks a single
 * org-level subscription per the universal billing pattern.
 */
export const PLAN_DEFINITIONS = [
  {
    code: "free",
    name: "Free (14-Day Trial)",
    priceCents: 0,
    booleans: {
      capture_web_lead: true,
      use_ai_lead_extraction: false,
      use_ai_call_summary: false,
      use_ai_followup_email: false,
      use_ai_lead_scoring: false,
      use_ai_opportunity_detection: false,
      use_workflow_automation: false,
      use_api: false,
      use_sso: false,
    },
    limits: { contacts: 100, leads: 100, ai_summaries_monthly: 20 },
  },
  {
    code: "starter",
    name: "Starter",
    priceCents: 2900,
    booleans: {
      capture_web_lead: true,
      use_ai_lead_extraction: true,
      use_ai_call_summary: false,
      use_ai_followup_email: false,
      use_ai_lead_scoring: false,
      use_ai_opportunity_detection: false,
      use_workflow_automation: true,
      use_api: false,
      use_sso: false,
    },
    limits: { contacts: 10_000, leads: null, ai_summaries_monthly: null },
  },
  {
    code: "pro",
    name: "Pro",
    priceCents: 7900,
    booleans: {
      capture_web_lead: true,
      use_ai_lead_extraction: true,
      use_ai_call_summary: true,
      use_ai_followup_email: true,
      use_ai_lead_scoring: true,
      use_ai_opportunity_detection: true,
      use_workflow_automation: true,
      use_api: true,
      use_sso: false,
    },
    limits: { contacts: null, leads: null, ai_summaries_monthly: null },
  },
  {
    code: "enterprise",
    name: "Enterprise",
    priceCents: 0,
    booleans: {
      capture_web_lead: true,
      use_ai_lead_extraction: true,
      use_ai_call_summary: true,
      use_ai_followup_email: true,
      use_ai_lead_scoring: true,
      use_ai_opportunity_detection: true,
      use_workflow_automation: true,
      use_api: true,
      use_sso: true,
    },
    limits: { contacts: null, leads: null, ai_summaries_monthly: null },
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
