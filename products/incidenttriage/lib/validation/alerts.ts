import { z } from "zod";

export const alertSeveritySchema = z.enum(["info", "warning", "critical"]);

export const createAlertSchema = z.object({
  serviceId: z.string().uuid(),
  source: z.string().min(1).max(120),
  message: z.string().min(1).max(2000),
  severity: alertSeveritySchema.default("warning"),
  occurredAt: z.coerce.date().optional(),
});

export const listAlertsQuerySchema = z.object({
  serviceId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const listIncidentsQuerySchema = z.object({
  status: z.enum(["open", "investigating", "resolved"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const updateIncidentStatusSchema = z.object({
  status: z.enum(["open", "investigating", "resolved"]),
});
