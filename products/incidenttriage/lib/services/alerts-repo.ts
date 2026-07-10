import { paginate } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { withinLimit, incrementUsage } from "@founder-os/platform/billing";
import { getIncidentTriageDb } from "../db.js";
import { correlateAlertsIntoIncidents } from "./correlation-engine.js";
import { refreshServiceHealth } from "./services-repo.js";
import type { z } from "zod";
import type { createAlertSchema, listAlertsQuerySchema } from "../validation/alerts.js";

type CreateAlertInput = z.infer<typeof createAlertSchema>;
type ListAlertsQuery = z.infer<typeof listAlertsQuerySchema>;

const CORRELATION_WINDOW_MINUTES = 15;
const SEVERITY_RANK: Record<string, number> = { info: 0, warning: 1, critical: 2 };

/**
 * Ingests one alert and correlates it into an incident per
 * products/incidenttriage/docs/PRODUCT_IDENTITY.md §7 "Alert
 * correlation." Reuses correlateAlertsIntoIncidents (the tested batch
 * chaining rule) applied to just [the service's most recent unresolved
 * incident's last alert, this new alert] — if they chain, the alert
 * joins that incident; otherwise a new incident opens.
 */
export async function ingestAlert(params: { organizationId: string; input: CreateAlertInput }) {
  const db = getIncidentTriageDb();

  const limitCheck = await withinLimit(params.organizationId, "incidents_monthly");
  if (!limitCheck.allowed) {
    throw new PlatformError("UNAUTHORIZED", `You've reached your plan's limit of ${limitCheck.limit} incidents this billing period. Upgrade your plan to ingest more alerts.`);
  }

  const service = await db.service.findFirst({ where: { id: params.input.serviceId, organizationId: params.organizationId } });
  if (!service) {
    throw new PlatformError("NOT_FOUND", "Service not found.");
  }

  const occurredAt = params.input.occurredAt ?? new Date();
  const existingIncident = await db.incident.findFirst({
    where: { organizationId: params.organizationId, serviceId: service.id, status: { in: ["open", "investigating"] } },
    orderBy: { startedAt: "desc" },
    include: { alerts: { orderBy: { occurredAt: "desc" }, take: 1 } },
  });

  let incidentId: string;
  const lastAlert = existingIncident?.alerts[0];
  const chains =
    existingIncident &&
    lastAlert &&
    correlateAlertsIntoIncidents(
      [
        { id: "previous", serviceId: service.id, occurredAt: lastAlert.occurredAt },
        { id: "new", serviceId: service.id, occurredAt },
      ],
      CORRELATION_WINDOW_MINUTES,
    ).length === 1;

  if (existingIncident && chains) {
    incidentId = existingIncident.id;
    if ((SEVERITY_RANK[params.input.severity] ?? 0) > (SEVERITY_RANK[existingIncident.severity] ?? 0)) {
      await db.incident.update({ where: { id: incidentId }, data: { severity: params.input.severity } });
    }
  } else {
    const incident = await db.incident.create({
      data: {
        organizationId: params.organizationId,
        serviceId: service.id,
        title: `${service.name}: ${params.input.message}`.slice(0, 200),
        severity: params.input.severity,
        startedAt: occurredAt,
      },
    });
    incidentId = incident.id;
  }

  const alert = await db.alert.create({
    data: {
      organizationId: params.organizationId,
      serviceId: service.id,
      incidentId,
      source: params.input.source,
      message: params.input.message,
      severity: params.input.severity,
      occurredAt,
    },
  });

  await incrementUsage({ organizationId: params.organizationId, metricKey: "incidents_monthly", amount: 1 });
  await refreshServiceHealth(params.organizationId);

  return alert;
}

export async function listAlerts(params: { organizationId: string; query: ListAlertsQuery }) {
  const db = getIncidentTriageDb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.alert.findMany({
        where: {
          organizationId: params.organizationId,
          ...(params.query.serviceId ? { serviceId: params.query.serviceId } : {}),
        },
        include: { service: true },
        orderBy: { occurredAt: "desc" },
        ...args,
      }),
  });
}
