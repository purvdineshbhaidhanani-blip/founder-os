import { paginate } from "@founder-os/platform/api";
import { getSecCorrelateDb } from "../db.js";
import { evaluateCorrelationRules } from "./correlation-engine.js";
import { listActiveCorrelationRules } from "./rules-repo.js";
import { listRecentLogEvents } from "./log-events-repo.js";

const DEFAULT_LOOKBACK_MINUTES = 60;

/**
 * Runs every active correlation rule against recent log events and
 * creates an Alert for each new match — "new" meaning no existing alert
 * already links the same pair of log events, so re-running (e.g. from a
 * scheduled job) is idempotent per products/seccorrelate/docs/PRODUCT_IDENTITY.md
 * §7 "Real-time rule engine."
 */
export async function runCorrelationEngine(organizationId: string) {
  const db = getSecCorrelateDb();
  const [rules, events] = await Promise.all([
    listActiveCorrelationRules(organizationId),
    listRecentLogEvents(organizationId, DEFAULT_LOOKBACK_MINUTES),
  ]);

  const matches = evaluateCorrelationRules(
    events.map((e) => ({ id: e.id, eventType: e.eventType, sourceIp: e.sourceIp, occurredAt: e.occurredAt })),
    rules.map((r) => ({ id: r.id, firstEventType: r.firstEventType, secondEventType: r.secondEventType, windowMinutes: r.windowMinutes })),
  );

  const created = [];
  for (const match of matches) {
    const existing = await db.alert.findFirst({
      where: { firstLogEventId: match.firstLogEventId, secondLogEventId: match.secondLogEventId },
    });
    if (existing) continue;

    const rule = rules.find((r) => r.id === match.ruleId)!;
    const alert = await db.alert.create({
      data: {
        organizationId,
        ruleId: rule.id,
        title: `${rule.name}: ${rule.firstEventType} → ${rule.secondEventType} from ${match.correlationKey}`,
        severity: rule.severity,
        correlationKey: match.correlationKey,
        firstLogEventId: match.firstLogEventId,
        secondLogEventId: match.secondLogEventId,
        mitreTechniqueIds: [],
      },
    });
    created.push(alert);
  }

  return created;
}

export async function listAlerts(params: {
  organizationId: string;
  status?: string;
  cursor?: string;
  limit?: number;
}) {
  const db = getSecCorrelateDb();
  return paginate({
    cursor: params.cursor,
    limit: params.limit,
    findMany: (args) =>
      db.alert.findMany({
        where: { organizationId: params.organizationId, ...(params.status ? { status: params.status as never } : {}) },
        include: { firstLogEvent: true, secondLogEvent: true, rule: true },
        orderBy: { detectedAt: "desc" },
        ...args,
      }),
  });
}

export async function getAlert(params: { organizationId: string; alertId: string }) {
  const db = getSecCorrelateDb();
  return db.alert.findFirst({
    where: { id: params.alertId, organizationId: params.organizationId },
    include: { firstLogEvent: true, secondLogEvent: true, rule: true, incidentSummary: true },
  });
}

export async function updateAlertStatus(params: { organizationId: string; alertId: string; status: string }) {
  const db = getSecCorrelateDb();
  return db.alert.updateMany({
    where: { id: params.alertId, organizationId: params.organizationId },
    data: { status: params.status as never, resolvedAt: params.status === "resolved" ? new Date() : undefined },
  });
}
