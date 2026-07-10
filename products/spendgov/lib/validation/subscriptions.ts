import { z } from "zod";

export const subscriptionKindSchema = z.enum(["saas", "ai_tool"]);
export const subscriptionStatusSchema = z.enum(["active", "canceled", "trial"]);

export const createSubscriptionSchema = z.object({
  kind: subscriptionKindSchema,
  vendorName: z.string().min(1).max(200),
  productName: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  department: z.string().max(100).optional(),
  monthlyCostCents: z.number().int().min(0),
  billingCycle: z.enum(["monthly", "annual"]).default("monthly"),
  seatsPurchased: z.number().int().min(0).optional(),
  seatsActive: z.number().int().min(0).optional(),
  lastUsedAt: z.coerce.date().optional(),
  renewalDate: z.coerce.date().optional(),
  contractNotes: z.string().max(5000).optional(),
});

export const updateSubscriptionSchema = createSubscriptionSchema.partial().extend({
  status: subscriptionStatusSchema.optional(),
});

export const listSubscriptionsQuerySchema = z.object({
  kind: subscriptionKindSchema.optional(),
  category: z.string().optional(),
  status: subscriptionStatusSchema.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const csvImportRowSchema = z.object({
  kind: subscriptionKindSchema,
  vendorName: z.string().min(1),
  productName: z.string().min(1),
  category: z.string().min(1),
  monthlyCostCents: z.number().int().min(0),
  seatsPurchased: z.number().int().min(0).optional(),
  seatsActive: z.number().int().min(0).optional(),
});

export const contractExtractionRequestSchema = z.object({
  subscriptionId: z.string().uuid().optional(),
  sourceText: z.string().min(20).max(50_000),
});
