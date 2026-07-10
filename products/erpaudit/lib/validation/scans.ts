import { z } from "zod";

export const roleAssignmentInputSchema = z.object({
  userIdentifier: z.string().min(1).max(200),
  permission: z.string().min(1).max(200),
});

export const configSettingInputSchema = z.object({
  key: z.string().min(1).max(200),
  value: z.string().max(2000),
});

export const createScanSchema = z.object({
  instanceId: z.string().uuid(),
  roleAssignments: z.array(roleAssignmentInputSchema).max(5000).default([]),
  configSettings: z.array(configSettingInputSchema).max(2000).default([]),
});

export const listScansQuerySchema = z.object({
  instanceId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const listFindingsQuerySchema = z.object({
  scanId: z.string().uuid().optional(),
  instanceId: z.string().uuid().optional(),
  status: z.enum(["open", "resolved", "accepted_risk"]).optional(),
  category: z.enum(["sod_violation", "config_error", "process_deviation"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const updateFindingStatusSchema = z.object({
  status: z.enum(["open", "resolved", "accepted_risk"]),
});
