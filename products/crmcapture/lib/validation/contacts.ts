import { z } from "zod";

export const leadSourceSchema = z.enum(["web_form", "email", "linkedin", "csv_import", "manual"]);

export const createContactSchema = z.object({
  firstName: z.string().min(1).max(120),
  lastName: z.string().max(120).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional(),
  company: z.string().max(200).optional(),
  jobTitle: z.string().max(200).optional(),
  linkedinUrl: z.string().url().optional(),
  source: leadSourceSchema.default("manual"),
});

export const listContactsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const extractContactSchema = z.object({
  rawText: z.string().min(1).max(10_000),
  source: leadSourceSchema.default("email"),
});
