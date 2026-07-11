import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().min(1).max(200),
});

export const listCompaniesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
