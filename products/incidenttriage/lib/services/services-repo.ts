import { paginate } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { withinLimit } from "@founder-os/platform/billing";
import { getIncidentTriageDb } from "../db.js";
import { computeServiceHealth } from "./service-health.js";
import type { z } from "zod";
import type { createServiceSchema, listServicesQuerySchema } from "../validation/services.js";

type CreateServiceInput = z.infer<typeof createServiceSchema>;
type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;

const HEALTH_LOOKBACK_MINUTES = 60;

export async function createService(params: { organizationId: string; input: CreateServiceInput }) {
  const db = getIncidentTriageDb();

  const limitCheck = await withinLimit(params.organizationId, "projects");
  const currentCount = await db.service.count({ where: { organizationId: params.organizationId } });
  if (!limitCheck.allowed || (limitCheck.limit !== null && currentCount >= limitCheck.limit)) {
    throw new PlatformError("UNAUTHORIZED", `You've reached your plan's limit of ${limitCheck.limit} projects. Upgrade your plan to add more.`);
  }

  return db.service.create({ data: { organizationId: params.organizationId, name: params.input.name } });
}

export async function listServices(params: { organizationId: string; query: ListServicesQuery }) {
  const db = getIncidentTriageDb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.service.findMany({
        where: { organizationId: params.organizationId },
        orderBy: { name: "asc" },
        ...args,
      }),
  });
}

/** Recomputes and persists every service's health status from its recent alerts — per PID §7 "Service health dashboard." */
export async function refreshServiceHealth(organizationId: string) {
  const db = getIncidentTriageDb();
  const since = new Date(Date.now() - HEALTH_LOOKBACK_MINUTES * 60 * 1000);
  const services = await db.service.findMany({ where: { organizationId } });

  for (const service of services) {
    const recentAlerts = await db.alert.findMany({
      where: { organizationId, serviceId: service.id, occurredAt: { gte: since } },
      select: { severity: true },
    });
    const status = computeServiceHealth(recentAlerts);
    if (status !== service.status) {
      await db.service.update({ where: { id: service.id }, data: { status } });
    }
  }

  return db.service.findMany({ where: { organizationId }, orderBy: { name: "asc" } });
}
