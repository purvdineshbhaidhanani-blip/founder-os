import { z } from "zod";

export const createLeadSchema = z.object({
  contactId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
  assignedToUserId: z.string().uuid().optional(),
});

export const listLeadsQuerySchema = z.object({
  status: z.enum(["new", "contacted", "qualified", "converted", "lost"]).optional(),
  assignedToUserId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const updateLeadSchema = z.object({
  status: z.enum(["new", "contacted", "qualified", "converted", "lost"]).optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).optional(),
});
