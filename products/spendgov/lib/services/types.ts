import type { z } from "zod";
import type {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  listSubscriptionsQuerySchema,
} from "../validation/subscriptions.js";

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
export type ListSubscriptionsQuery = z.infer<typeof listSubscriptionsQuerySchema>;
