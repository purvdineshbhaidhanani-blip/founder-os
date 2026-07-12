import { createPlan, setPlanEntitlement, getPlanByCode } from "@founder-os/platform/billing";
import { createSubscription as createBillingSubscription, getSubscriptionForOrganization } from "@founder-os/platform/billing";
import { can, withinLimit } from "@founder-os/platform/billing";

/**
 * Pricing tiers per products/contactverify/docs/PRODUCT_IDENTITY.md
 * §21-22 — Free/Starter/Pro/Business/Enterprise, entitlements transcribed
 * verbatim from the "Entitlements Logic (Pricing Engine)" table, updated
 * per COMMERCIAL_FREEZE.md (Loop 2) §Section 1 & §Section 2: a `business`
 * tier is inserted between `pro` and `enterprise`, the AI Contact Health
 * Engine (`use_health_score`) moves Pro-only → Starter+ and is now
 * credit-metered via `ai_credits_monthly`, and the previously-unbounded
 * Pro `verifications_monthly` limit is capped.
 */
export const PLAN_DEFINITIONS = [
  {
    code: "free",
    name: "Free",
    priceCents: 0,
    booleans: {
      validate_email: true,
      validate_phone: true,
      detect_duplicates: true,
      enrich_contact: false,
      use_health_score: false,
      sync_to_crm: false,
      use_workflow_automation: false,
      use_api: false,
      use_sso: false,
      use_scim: false,
    },
    limits: { verifications_monthly: 500, ai_credits_monthly: 0 },
  },
  {
    code: "starter",
    name: "Starter",
    priceCents: 2900,
    booleans: {
      validate_email: true,
      validate_phone: true,
      detect_duplicates: true,
      enrich_contact: true,
      use_health_score: true,
      sync_to_crm: true,
      use_workflow_automation: false,
      use_api: true,
      use_sso: false,
      use_scim: false,
    },
    limits: { verifications_monthly: 10_000, ai_credits_monthly: 20 },
  },
  {
    code: "pro",
    name: "Pro",
    priceCents: 9900,
    booleans: {
      validate_email: true,
      validate_phone: true,
      detect_duplicates: true,
      enrich_contact: true,
      use_health_score: true,
      sync_to_crm: true,
      use_workflow_automation: true,
      use_api: true,
      use_sso: false,
      use_scim: false,
    },
    limits: { verifications_monthly: 50_000, ai_credits_monthly: 150 },
  },
  {
    code: "business",
    name: "Business",
    priceCents: 22900,
    booleans: {
      validate_email: true,
      validate_phone: true,
      detect_duplicates: true,
      enrich_contact: true,
      use_health_score: true,
      sync_to_crm: true,
      use_workflow_automation: true,
      use_api: true,
      use_sso: false,
      use_scim: false,
    },
    limits: { verifications_monthly: 200_000, ai_credits_monthly: 450 },
  },
  {
    code: "enterprise",
    name: "Enterprise",
    priceCents: 0,
    booleans: {
      validate_email: true,
      validate_phone: true,
      detect_duplicates: true,
      enrich_contact: true,
      use_health_score: true,
      sync_to_crm: true,
      use_workflow_automation: true,
      use_api: true,
      use_sso: true,
      use_scim: true,
    },
    limits: { verifications_monthly: null, ai_credits_monthly: null },
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
