import { createPlan, setPlanEntitlement, getPlanByCode } from "@founder-os/platform/billing";
import { createSubscription as createBillingSubscription, getSubscriptionForOrganization } from "@founder-os/platform/billing";
import { can, withinLimit } from "@founder-os/platform/billing";

/**
 * Pricing tiers per products/authstartup/docs/PRODUCT_IDENTITY.md
 * §21-22 — Free/Starter/Pro/Enterprise, entitlements transcribed
 * verbatim from the "Entitlements Logic (Pricing Engine)" table.
 */
export const PLAN_DEFINITIONS = [
  {
    code: "free",
    name: "Free",
    priceCents: 0,
    booleans: {
      use_oauth: true,
      use_magic_links: false,
      use_mfa: false,
      use_organizations: false,
      use_custom_domains: false,
      use_webhooks: false,
      use_saml: false,
      use_scim: false,
      use_ai_security_advisor: false,
      use_dedicated_cluster: false,
    },
    limits: { projects: 1, monthly_active_users: 1000, ai_credits_monthly: 0 },
  },
  {
    code: "starter",
    name: "Starter",
    priceCents: 2500,
    booleans: {
      use_oauth: true,
      use_magic_links: true,
      use_mfa: true,
      use_organizations: false,
      use_custom_domains: false,
      use_webhooks: false,
      use_saml: false,
      use_scim: false,
      // COMMERCIAL_FREEZE.md Loop 2: AI Security Advisor moves from Pro-only
      // to Starter+, now credit-metered via ai_credits_monthly below.
      use_ai_security_advisor: true,
      use_dedicated_cluster: false,
    },
    // Loop 2 flagged the Loop-1 `projects: 1` (same as Free) as a gap; bumped to 3.
    limits: { projects: 3, monthly_active_users: 10_000, ai_credits_monthly: 5 },
  },
  {
    code: "pro",
    name: "Pro",
    priceCents: 7900,
    booleans: {
      use_oauth: true,
      use_magic_links: true,
      use_mfa: true,
      use_organizations: true,
      use_custom_domains: true,
      use_webhooks: true,
      use_saml: true,
      use_scim: true,
      use_ai_security_advisor: true,
      use_dedicated_cluster: false,
    },
    limits: { projects: 25, monthly_active_users: 100_000, ai_credits_monthly: 40 },
  },
  {
    code: "business",
    name: "Business",
    priceCents: 19900,
    booleans: {
      use_oauth: true,
      use_magic_links: true,
      use_mfa: true,
      use_organizations: true,
      use_custom_domains: true,
      use_webhooks: true,
      // SAML/SSO/SCIM stay Enterprise-only (marketing-tier — not actually
      // implemented in code yet per Loop 2 audit).
      use_saml: false,
      use_scim: false,
      use_ai_security_advisor: true,
      use_dedicated_cluster: false,
    },
    limits: { projects: 100, monthly_active_users: 500_000, ai_credits_monthly: 120 },
  },
  {
    code: "enterprise",
    name: "Enterprise",
    priceCents: 0,
    booleans: {
      use_oauth: true,
      use_magic_links: true,
      use_mfa: true,
      use_organizations: true,
      use_custom_domains: true,
      use_webhooks: true,
      use_saml: true,
      use_scim: true,
      use_ai_security_advisor: true,
      use_dedicated_cluster: true,
    },
    // Unlimited / fair-use.
    limits: { projects: null, monthly_active_users: null, ai_credits_monthly: null },
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
