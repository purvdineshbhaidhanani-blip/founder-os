import { z } from "zod";

export const scanFileInputSchema = z.object({
  path: z.string().min(1).max(500),
  content: z.string().max(200_000),
});

export const createScanSchema = z.object({
  repositoryId: z.string().uuid(),
  files: z.array(scanFileInputSchema).min(1).max(200),
});

export const listScansQuerySchema = z.object({
  repositoryId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const listFindingsQuerySchema = z.object({
  scanId: z.string().uuid().optional(),
  repositoryId: z.string().uuid().optional(),
  status: z.enum(["open", "fixed", "false_positive", "wont_fix"]).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const updateFindingStatusSchema = z.object({
  status: z.enum(["open", "fixed", "false_positive", "wont_fix"]),
});
