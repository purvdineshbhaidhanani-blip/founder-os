import { getPlatformDb, currentAppId } from "../db/index.js";
import { conflictError, notFoundError } from "../errors/index.js";
import type { CreatePlanInput, SetPlanEntitlementInput } from "./validation.js";

/**
 * Plans are per-product (scoped by app_id), matching each product's own
 * PRODUCT_IDENTITY.md pricing tiers — SpendGov's "Pro" and CodeAudit's
 * "Pro" are different Plan rows even though the code happens to match,
 * because they carry different entitlements and prices.
 */
export async function createPlan(input: CreatePlanInput) {
  const db = getPlatformDb();
  const appId = currentAppId();

  const existing = await db.plan.findUnique({
    where: { uq_plans_app_id_code_interval: { appId, code: input.code, billingInterval: input.billingInterval } },
  });
  if (existing) throw conflictError(`Plan "${input.code}" (${input.billingInterval}) already exists for this product.`);

  return db.plan.create({
    data: {
      appId,
      code: input.code,
      name: input.name,
      billingInterval: input.billingInterval,
      priceCents: input.priceCents,
      currency: input.currency,
    },
  });
}

export async function getPlanByCode(code: string, billingInterval: "monthly" | "yearly") {
  const plan = await getPlatformDb().plan.findUnique({
    where: { uq_plans_app_id_code_interval: { appId: currentAppId(), code, billingInterval } },
    include: { entitlements: true },
  });
  if (!plan || !plan.isActive) throw notFoundError("Plan");
  return plan;
}

export async function listActivePlans() {
  return getPlatformDb().plan.findMany({
    where: { appId: currentAppId(), isActive: true },
    include: { entitlements: true },
    orderBy: { priceCents: "asc" },
  });
}

export async function setPlanEntitlement(planId: string, input: SetPlanEntitlementInput) {
  const db = getPlatformDb();
  const plan = await db.plan.findUnique({ where: { id: planId } });
  if (!plan) throw notFoundError("Plan");

  return db.planEntitlement.upsert({
    where: { uq_plan_entitlements_plan_feature: { planId, featureKey: input.featureKey } },
    create: {
      planId,
      featureKey: input.featureKey,
      kind: input.kind,
      boolValue: input.boolValue,
      numericLimit: input.numericLimit,
    },
    update: {
      kind: input.kind,
      boolValue: input.boolValue,
      numericLimit: input.numericLimit,
    },
  });
}

export async function deactivatePlan(planId: string): Promise<void> {
  await getPlatformDb().plan.update({ where: { id: planId }, data: { isActive: false } });
}
