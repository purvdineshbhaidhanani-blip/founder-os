import { createPlan, setPlanEntitlement, getPlanByCode } from "@founder-os/platform/billing";
import { createSubscription as createBillingSubscription, getSubscriptionForOrganization } from "@founder-os/platform/billing";
import { can, withinLimit } from "@founder-os/platform/billing";

/**
 * Pricing tiers per products/characterconsistency/docs/PRODUCT_IDENTITY.md
 * §21-22 — Free/Starter/Pro/Business/Enterprise, entitlements transcribed
 * verbatim from the "Entitlements Logic (Pricing Engine)" table, updated
 * per COMMERCIAL_FREEZE.md Loop 2 (5-tier model, `ai_credits_monthly`
 * added as a limit distinct from `generations_monthly`).
 */
export const PLAN_DEFINITIONS = [
  {
    code: "free",
    name: "Free",
    priceCents: 0,
    booleans: {
      use_outfit_pose_memory: false,
      use_story_memory: false,
      use_hd_export: false,
      use_multi_character_scenes: false,
      use_video_consistency: false,
      use_team_workspace: false,
      use_api: false,
      use_white_label: false,
      use_private_models: false,
    },
    limits: { characters: 1, generations_monthly: 20, style_references: 5, ai_credits_monthly: 0 },
  },
  {
    code: "starter",
    name: "Starter",
    priceCents: 1900,
    booleans: {
      use_outfit_pose_memory: true,
      // Moves from Pro-only to Starter+, now credit-metered — approved Loop 2 pricing-model decision (COMMERCIAL_FREEZE.md).
      use_story_memory: true,
      use_hd_export: true,
      use_multi_character_scenes: false,
      use_video_consistency: false,
      use_team_workspace: false,
      use_api: true,
      use_white_label: false,
      use_private_models: false,
    },
    limits: { characters: 10, generations_monthly: 500, style_references: 50, ai_credits_monthly: 5 },
  },
  {
    code: "pro",
    name: "Pro",
    priceCents: 5900,
    booleans: {
      use_outfit_pose_memory: true,
      use_story_memory: true,
      use_hd_export: true,
      use_multi_character_scenes: true,
      use_video_consistency: true,
      use_team_workspace: true,
      use_api: true,
      use_white_label: false,
      use_private_models: false,
    },
    limits: { characters: 50, generations_monthly: 2500, style_references: 200, ai_credits_monthly: 30 },
  },
  {
    code: "business",
    name: "Business",
    priceCents: 12900,
    booleans: {
      use_outfit_pose_memory: true,
      use_story_memory: true,
      use_hd_export: true,
      use_multi_character_scenes: true,
      use_video_consistency: true,
      use_team_workspace: true,
      use_api: true,
      use_white_label: false,
      use_private_models: false,
    },
    limits: { characters: 200, generations_monthly: 10000, style_references: 1000, ai_credits_monthly: 90 },
  },
  {
    code: "enterprise",
    name: "Enterprise",
    priceCents: 0,
    booleans: {
      use_outfit_pose_memory: true,
      use_story_memory: true,
      use_hd_export: true,
      use_multi_character_scenes: true,
      use_video_consistency: true,
      use_team_workspace: true,
      use_api: true,
      use_white_label: true,
      use_private_models: true,
    },
    limits: { characters: null, generations_monthly: null, style_references: null, ai_credits_monthly: null },
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
