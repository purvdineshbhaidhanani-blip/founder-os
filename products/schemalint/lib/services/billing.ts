import { createPlan, setPlanEntitlement, getPlanByCode } from "@founder-os/platform/billing";
import { createSubscription as createBillingSubscription, getSubscriptionForOrganization } from "@founder-os/platform/billing";
import { can, withinLimit } from "@founder-os/platform/billing";

/**
 * Pricing tiers per products/schemalint/docs/PRODUCT_IDENTITY.md §21-22
 * — Free/Starter/Pro/Business/Enterprise, entitlements transcribed verbatim
 * from the "Entitlements Logic (Pricing Engine)" table, prices and limits
 * locked by COMMERCIAL_FREEZE.md's SchemaLint section + "LOOP 2 COMPLETION"
 * tables. The AI Database Architect (killer feature) is gated behind
 * `use_performance_advisor`, the closest gated key to the umbrella "AI
 * Database Architect" capability described in §5/§28, and now moves
 * Pro-only → Starter+ (credit-metered via `ai_credits_monthly`) per
 * COMMERCIAL_FREEZE.md's Loop 2 pricing-model decision, matching the
 * pattern used for CharacterConsistency's AI Character DNA gate.
 */
export const PLAN_DEFINITIONS = [
  {
    code: "free",
    name: "Free",
    priceCents: 0,
    booleans: {
      use_ai_optimization_suggestions: false,
      use_index_recommendations: false,
      use_migration_planning: false,
      use_performance_advisor: false,
      use_security_audit: false,
      use_normalization_review: false,
      use_team_collaboration: false,
      use_api: false,
      use_sso: false,
    },
    limits: { database_schemas: 3, tables: 100, ai_credits_monthly: 0 },
  },
  {
    code: "starter",
    name: "Starter",
    priceCents: 1900,
    booleans: {
      use_ai_optimization_suggestions: true,
      use_index_recommendations: true,
      use_migration_planning: false,
      use_performance_advisor: true,
      use_security_audit: false,
      use_normalization_review: false,
      use_team_collaboration: false,
      use_api: false,
      use_sso: false,
    },
    limits: { database_schemas: 20, tables: 2000, ai_credits_monthly: 5 },
  },
  {
    code: "pro",
    name: "Pro",
    priceCents: 5900,
    booleans: {
      use_ai_optimization_suggestions: true,
      use_index_recommendations: true,
      use_migration_planning: true,
      use_performance_advisor: true,
      use_security_audit: true,
      use_normalization_review: true,
      use_team_collaboration: true,
      use_api: true,
      use_sso: false,
    },
    limits: { database_schemas: 100, tables: 10000, ai_credits_monthly: 40 },
  },
  {
    code: "business",
    name: "Business",
    priceCents: 12900,
    booleans: {
      use_ai_optimization_suggestions: true,
      use_index_recommendations: true,
      use_migration_planning: true,
      use_performance_advisor: true,
      use_security_audit: true,
      use_normalization_review: true,
      use_team_collaboration: true,
      use_api: true,
      use_sso: false,
    },
    limits: { database_schemas: 400, tables: 40000, ai_credits_monthly: 120 },
  },
  {
    code: "enterprise",
    name: "Enterprise",
    priceCents: 0,
    booleans: {
      use_ai_optimization_suggestions: true,
      use_index_recommendations: true,
      use_migration_planning: true,
      use_performance_advisor: true,
      use_security_audit: true,
      use_normalization_review: true,
      use_team_collaboration: true,
      use_api: true,
      use_sso: true,
    },
    limits: { database_schemas: null, tables: null, ai_credits_monthly: null },
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
