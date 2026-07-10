import { z } from "zod";

export const repoVisibilitySchema = z.enum(["private", "public"]);

export const createRepositorySchema = z.object({
  name: z.string().min(1).max(200),
  defaultBranch: z.string().min(1).max(200).default("main"),
  visibility: repoVisibilitySchema.default("private"),
});

export const listRepositoriesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
