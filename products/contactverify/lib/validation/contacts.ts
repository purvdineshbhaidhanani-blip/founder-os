import { z } from "zod";

export const createContactSchema = z.object({
  firstName: z.string().min(1).max(120),
  lastName: z.string().max(120).optional(),
  email: z.string().max(320).optional(),
  phone: z.string().max(40).optional(),
  company: z.string().max(200).optional(),
  jobTitle: z.string().max(200).optional(),
});

export const listContactsQuerySchema = z.object({
  emailStatus: z.enum(["valid", "invalid", "risky", "unchecked"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
