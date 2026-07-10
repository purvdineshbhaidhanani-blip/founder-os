import { paginate } from "@founder-os/platform/api";
import { getCodeAuditDb } from "../db.js";
import type { z } from "zod";
import type { listFindingsQuerySchema } from "../validation/scans.js";

type ListFindingsQuery = z.infer<typeof listFindingsQuerySchema>;

export async function listFindings(params: { organizationId: string; query: ListFindingsQuery }) {
  const db = getCodeAuditDb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.finding.findMany({
        where: {
          organizationId: params.organizationId,
          ...(params.query.scanId ? { scanId: params.query.scanId } : {}),
          ...(params.query.repositoryId ? { repositoryId: params.query.repositoryId } : {}),
          ...(params.query.status ? { status: params.query.status } : {}),
          ...(params.query.severity ? { severity: params.query.severity } : {}),
        },
        orderBy: { createdAt: "desc" },
        ...args,
      }),
  });
}

export async function getFinding(params: { organizationId: string; findingId: string }) {
  const db = getCodeAuditDb();
  return db.finding.findFirst({
    where: { id: params.findingId, organizationId: params.organizationId },
    include: { fixSuggestion: true },
  });
}

export async function updateFindingStatus(params: { organizationId: string; findingId: string; status: string }) {
  const db = getCodeAuditDb();
  return db.finding.updateMany({
    where: { id: params.findingId, organizationId: params.organizationId },
    data: { status: params.status as never },
  });
}
