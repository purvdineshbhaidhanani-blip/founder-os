import { paginate, type PaginatedResult } from "@founder-os/platform/api";
import type { Prisma } from ".prisma/seccorrelate-client/index.js";
import { getSecCorrelateDb } from "../db.js";
import type { z } from "zod";
import type { createLogEventSchema, listLogEventsQuerySchema } from "../validation/log-events.js";

type CreateLogEventInput = z.infer<typeof createLogEventSchema>;
type ListLogEventsQuery = z.infer<typeof listLogEventsQuerySchema>;

export async function createLogEvent(params: { organizationId: string; input: CreateLogEventInput }) {
  const db = getSecCorrelateDb();
  return db.logEvent.create({
    data: {
      organizationId: params.organizationId,
      source: params.input.source,
      eventType: params.input.eventType,
      severity: params.input.severity,
      sourceIp: params.input.sourceIp,
      actorId: params.input.actorId,
      payload: (params.input.payload ?? {}) as Prisma.InputJsonValue,
      occurredAt: params.input.occurredAt ?? new Date(),
    },
  });
}

export async function listLogEvents(params: { organizationId: string; query: ListLogEventsQuery }): Promise<PaginatedResult<Awaited<ReturnType<typeof createLogEvent>>>> {
  const db = getSecCorrelateDb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.logEvent.findMany({
        where: {
          organizationId: params.organizationId,
          ...(params.query.source ? { source: params.query.source } : {}),
          ...(params.query.eventType ? { eventType: params.query.eventType } : {}),
        },
        orderBy: { occurredAt: "desc" },
        ...args,
      }),
  });
}

/** Recent-window log events for correlation-rule evaluation — bounded lookback, not the full history. */
export async function listRecentLogEvents(organizationId: string, lookbackMinutes: number) {
  const db = getSecCorrelateDb();
  const since = new Date(Date.now() - lookbackMinutes * 60 * 1000);
  return db.logEvent.findMany({
    where: { organizationId, occurredAt: { gte: since } },
    orderBy: { occurredAt: "asc" },
  });
}
