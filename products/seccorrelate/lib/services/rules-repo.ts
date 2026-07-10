import { getSecCorrelateDb } from "../db.js";
import type { z } from "zod";
import type { createCorrelationRuleSchema } from "../validation/log-events.js";

type CreateCorrelationRuleInput = z.infer<typeof createCorrelationRuleSchema>;

export async function createCorrelationRule(params: { organizationId: string; createdByUserId: string; input: CreateCorrelationRuleInput }) {
  const db = getSecCorrelateDb();
  return db.correlationRule.create({
    data: {
      organizationId: params.organizationId,
      createdByUserId: params.createdByUserId,
      name: params.input.name,
      description: params.input.description,
      firstEventType: params.input.firstEventType,
      secondEventType: params.input.secondEventType,
      correlationField: params.input.correlationField,
      windowMinutes: params.input.windowMinutes,
      severity: params.input.severity,
    },
  });
}

export async function listActiveCorrelationRules(organizationId: string) {
  const db = getSecCorrelateDb();
  return db.correlationRule.findMany({ where: { organizationId, isActive: true }, orderBy: { createdAt: "desc" } });
}

export async function listCorrelationRules(organizationId: string) {
  const db = getSecCorrelateDb();
  return db.correlationRule.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" } });
}

export async function deactivateCorrelationRule(params: { organizationId: string; ruleId: string }) {
  const db = getSecCorrelateDb();
  return db.correlationRule.updateMany({ where: { id: params.ruleId, organizationId: params.organizationId }, data: { isActive: false } });
}
