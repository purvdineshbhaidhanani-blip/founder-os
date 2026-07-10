import { z } from "zod";

export const logSourceSchema = z.enum(["firewall", "edr", "iam", "app", "dns"]);
export const logSeveritySchema = z.enum(["info", "low", "medium", "high", "critical"]);

export const createLogEventSchema = z.object({
  source: logSourceSchema,
  eventType: z.string().min(1).max(100),
  severity: logSeveritySchema.default("info"),
  sourceIp: z.string().max(45).optional(),
  actorId: z.string().max(200).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  occurredAt: z.coerce.date().optional(),
});

export const listLogEventsQuerySchema = z.object({
  source: logSourceSchema.optional(),
  eventType: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const createCorrelationRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  firstEventType: z.string().min(1).max(100),
  secondEventType: z.string().min(1).max(100),
  correlationField: z.literal("sourceIp").default("sourceIp"),
  windowMinutes: z.number().int().min(1).max(1440),
  severity: logSeveritySchema.default("medium"),
});

export const updateAlertStatusSchema = z.object({
  status: z.enum(["open", "investigating", "resolved", "dismissed"]),
});
