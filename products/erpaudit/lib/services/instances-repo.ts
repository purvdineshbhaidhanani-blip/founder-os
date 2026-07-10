import { paginate } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { withinLimit } from "@founder-os/platform/billing";
import { getERPAuditDb } from "../db.js";
import type { z } from "zod";
import type { createInstanceSchema, listInstancesQuerySchema } from "../validation/instances.js";

type CreateInstanceInput = z.infer<typeof createInstanceSchema>;
type ListInstancesQuery = z.infer<typeof listInstancesQuerySchema>;

export async function createInstance(params: { organizationId: string; input: CreateInstanceInput }) {
  const db = getERPAuditDb();

  const limitCheck = await withinLimit(params.organizationId, "erp_instances");
  const currentCount = await db.erpInstance.count({ where: { organizationId: params.organizationId } });
  if (!limitCheck.allowed || (limitCheck.limit !== null && currentCount >= limitCheck.limit)) {
    throw new PlatformError("UNAUTHORIZED", `You've reached your plan's limit of ${limitCheck.limit} ERP instance(s). Upgrade your plan to add more.`);
  }

  return db.erpInstance.create({ data: { organizationId: params.organizationId, name: params.input.name, erpSystem: params.input.erpSystem } });
}

export async function listInstances(params: { organizationId: string; query: ListInstancesQuery }) {
  const db = getERPAuditDb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.erpInstance.findMany({
        where: { organizationId: params.organizationId },
        orderBy: { createdAt: "desc" },
        ...args,
      }),
  });
}

export async function getInstance(params: { organizationId: string; instanceId: string }) {
  const db = getERPAuditDb();
  return db.erpInstance.findFirst({ where: { id: params.instanceId, organizationId: params.organizationId } });
}
