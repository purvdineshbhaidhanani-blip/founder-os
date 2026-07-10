import { paginate } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { getIncidentTriageDb } from "../db.js";
import type { z } from "zod";
import type { listIncidentsQuerySchema } from "../validation/alerts.js";

type ListIncidentsQuery = z.infer<typeof listIncidentsQuerySchema>;

export async function listIncidents(params: { organizationId: string; query: ListIncidentsQuery }) {
  const db = getIncidentTriageDb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.incident.findMany({
        where: {
          organizationId: params.organizationId,
          ...(params.query.status ? { status: params.query.status } : {}),
        },
        include: { service: true, alerts: true },
        orderBy: { startedAt: "desc" },
        ...args,
      }),
  });
}

export async function getIncident(params: { organizationId: string; incidentId: string }) {
  const db = getIncidentTriageDb();
  return db.incident.findFirst({
    where: { id: params.incidentId, organizationId: params.organizationId },
    include: { service: true, alerts: { orderBy: { occurredAt: "asc" } }, rootCauseAnalysis: true },
  });
}

export async function updateIncidentStatus(params: { organizationId: string; incidentId: string; status: string }) {
  const db = getIncidentTriageDb();
  const result = await db.incident.updateMany({
    where: { id: params.incidentId, organizationId: params.organizationId },
    data: { status: params.status as never, resolvedAt: params.status === "resolved" ? new Date() : undefined },
  });
  if (result.count === 0) {
    throw new PlatformError("NOT_FOUND", "Incident not found.");
  }
  return getIncident({ organizationId: params.organizationId, incidentId: params.incidentId });
}
