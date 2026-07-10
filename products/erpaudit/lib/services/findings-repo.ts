import { paginate } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { getERPAuditDb } from "../db.js";
import type { z } from "zod";
import type { listFindingsQuerySchema } from "../validation/scans.js";

type ListFindingsQuery = z.infer<typeof listFindingsQuerySchema>;

export async function listFindings(params: { organizationId: string; query: ListFindingsQuery }) {
  const db = getERPAuditDb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.finding.findMany({
        where: {
          organizationId: params.organizationId,
          ...(params.query.scanId ? { scanId: params.query.scanId } : {}),
          ...(params.query.instanceId ? { instanceId: params.query.instanceId } : {}),
          ...(params.query.status ? { status: params.query.status } : {}),
          ...(params.query.category ? { category: params.query.category } : {}),
        },
        include: { scan: { include: { instance: true } } },
        orderBy: { createdAt: "desc" },
        ...args,
      }),
  });
}

export async function getFinding(params: { organizationId: string; findingId: string }) {
  const db = getERPAuditDb();
  return db.finding.findFirst({
    where: { id: params.findingId, organizationId: params.organizationId },
    include: { scan: { include: { instance: true } }, summary: true },
  });
}

export async function updateFindingStatus(params: { organizationId: string; findingId: string; status: string }) {
  const db = getERPAuditDb();
  const result = await db.finding.updateMany({
    where: { id: params.findingId, organizationId: params.organizationId },
    data: { status: params.status as never },
  });
  if (result.count === 0) {
    throw new PlatformError("NOT_FOUND", "Finding not found.");
  }
  return getFinding({ organizationId: params.organizationId, findingId: params.findingId });
}
