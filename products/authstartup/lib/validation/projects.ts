import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  environment: z.enum(["development", "production"]).default("development"),
  requireMfa: z.boolean().default(false),
  sessionTtlMinutes: z.number().int().min(15).max(60 * 24 * 365).default(10_080),
});

export const updateProjectSchema = z.object({
  requireMfa: z.boolean().optional(),
  sessionTtlMinutes: z.number().int().min(15).max(60 * 24 * 365).optional(),
});

export const listProjectsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(120),
});
