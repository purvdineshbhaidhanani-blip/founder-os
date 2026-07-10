import { createPlan, setPlanEntitlement, getPlanByCode } from "@founder-os/platform/billing";
import { createSubscription as createBillingSubscription, getSubscriptionForOrganization } from "@founder-os/platform/billing";
import { can, withinLimit } from "@founder-os/platform/billing";

/**
 * Pricing tiers per products/codeaudit/docs/PRODUCT_IDENTITY.md §21-22 —
 * Free/Starter/Pro/Enterprise, entitlements transcribed verbatim from the
 * "Entitlements Logic (Pricing Engine)" table. Per-developer/seat pricing
 * (§21) is a Phase 2 metering/invoicing concern; Phase 1 tracks a single
 * org-level subscription per the universal billing pattern.
 */
export const PLAN_DEFINITIONS = [
  {
    code: "free",
    name: "Free (No Card)",
    priceCents: 0,
    booleans: {
      scan_pr: true,
      use_ci_cd: false,
      use_ai_explanations: false,
      use_ai_fix_engine: false,
      use_secret_detection: false,
      use_dependency_scan: false,
      use_container_scan: false,
      use_custom_rules: false,
      use_api: false,
      use_sso: false,
    },
    limits: { private_repos: 1, public_repos: 3, files_scanned_monthly: 500, pr_scans_monthly: 20 },
  },
  {
    code: "starter",
    name: "Starter",
    priceCents: 1900,
    booleans: {
      scan_pr: true,
      use_ci_cd: true,
      use_ai_explanations: true,
      use_ai_fix_engine: false,
      use_secret_detection: false,
      use_dependency_scan: false,
      use_container_scan: false,
      use_custom_rules: false,
      use_api: false,
      use_sso: false,
    },
    limits: { private_repos: 10, public_repos: null, files_scanned_monthly: 5000, pr_scans_monthly: 300 },
  },
  {
    code: "pro",
    name: "Pro",
    priceCents: 4900,
    booleans: {
      scan_pr: true,
      use_ci_cd: true,
      use_ai_explanations: true,
      use_ai_fix_engine: true,
      use_secret_detection: true,
      use_dependency_scan: true,
      use_container_scan: true,
      use_custom_rules: true,
      use_api: true,
      use_sso: false,
    },
    limits: { private_repos: null, public_repos: null, files_scanned_monthly: null, pr_scans_monthly: null },
  },
  {
    code: "enterprise",
    name: "Enterprise",
    priceCents: 0,
    booleans: {
      scan_pr: true,
      use_ci_cd: true,
      use_ai_explanations: true,
      use_ai_fix_engine: true,
      use_secret_detection: true,
      use_dependency_scan: true,
      use_container_scan: true,
      use_custom_rules: true,
      use_api: true,
      use_sso: true,
    },
    limits: { private_repos: null, public_repos: null, files_scanned_monthly: null, pr_scans_monthly: null },
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
