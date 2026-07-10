import { z } from "zod";

export const billingIntervalSchema = z.enum(["monthly", "yearly"]);

export const createPlanSchema = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  billingInterval: billingIntervalSchema,
  priceCents: z.number().int().min(0),
  currency: z.string().length(3).default("usd"),
});
export type CreatePlanInput = z.infer<typeof createPlanSchema>;

export const entitlementKindSchema = z.enum(["boolean", "numeric_limit"]);

export const setPlanEntitlementSchema = z.object({
  featureKey: z.string().trim().min(1).max(80),
  kind: entitlementKindSchema,
  boolValue: z.boolean().optional(),
  numericLimit: z.number().int().min(0).nullable().optional(), // null = unlimited
});
export type SetPlanEntitlementInput = z.infer<typeof setPlanEntitlementSchema>;

export const createSubscriptionSchema = z.object({
  organizationId: z.string().uuid(),
  planCode: z.string().trim().min(1),
  billingInterval: billingIntervalSchema,
  trialDays: z.number().int().min(0).max(90).optional(),
});
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

export const incrementUsageSchema = z.object({
  organizationId: z.string().uuid(),
  metricKey: z.string().trim().min(1).max(80),
  amount: z.number().int().min(1).default(1),
});
export type IncrementUsageInput = z.infer<typeof incrementUsageSchema>;
