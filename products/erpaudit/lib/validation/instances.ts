import { z } from "zod";

export const erpSystemSchema = z.enum(["sap", "oracle", "dynamics"]);

export const createInstanceSchema = z.object({
  name: z.string().min(1).max(200),
  erpSystem: erpSystemSchema,
});

export const listInstancesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
