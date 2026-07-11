import { createPlan, setPlanEntitlement, getPlanByCode } from "@founder-os/platform/billing";
import { createSubscription as createBillingSubscription, getSubscriptionForOrganization } from "@founder-os/platform/billing";
import { can, withinLimit } from "@founder-os/platform/billing";

/**
 * Pricing tiers per products/payrollaudit/docs/PRODUCT_IDENTITY.md
 * §21-22 — Free/Starter/Pro/Enterprise, entitlements transcribed
 * verbatim from the "Entitlements Logic (Pricing Engine)" table.
 */
export const PLAN_DEFINITIONS = [
  {
    code: "free",
    name: "Free",
    priceCents: 0,
    booleans: {
      validate_tax: false,
      validate_overtime: false,
      use_ai_error_detection: false,
      import_attendance: false,
      forecast_salary: false,
      use_workflow_approvals: false,
      use_api: false,
      view_audit_log: false,
      use_sso: false,
      use_scim: false,
    },
    limits: { companies: 1, employees: 20, payroll_runs_monthly: 1 },
  },
  {
    code: "starter",
    name: "Starter",
    priceCents: 3900,
    booleans: {
      validate_tax: true,
      validate_overtime: true,
      use_ai_error_detection: true,
      import_attendance: true,
      forecast_salary: false,
      use_workflow_approvals: false,
      use_api: false,
      view_audit_log: false,
      use_sso: false,
      use_scim: false,
    },
    limits: { companies: 1, employees: 250, payroll_runs_monthly: null },
  },
  {
    code: "pro",
    name: "Pro",
    priceCents: 12900,
    booleans: {
      validate_tax: true,
      validate_overtime: true,
      use_ai_error_detection: true,
      import_attendance: true,
      forecast_salary: true,
      use_workflow_approvals: true,
      use_api: true,
      view_audit_log: true,
      use_sso: false,
      use_scim: false,
    },
    limits: { companies: null, employees: null, payroll_runs_monthly: null },
  },
  {
    code: "enterprise",
    name: "Enterprise",
    priceCents: 0,
    booleans: {
      validate_tax: true,
      validate_overtime: true,
      use_ai_error_detection: true,
      import_attendance: true,
      forecast_salary: true,
      use_workflow_approvals: true,
      use_api: true,
      view_audit_log: true,
      use_sso: true,
      use_scim: true,
    },
    limits: { companies: null, employees: null, payroll_runs_monthly: null },
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
