import { paginate } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { getTranscriptionQADb } from "../db.js";
import type { z } from "zod";
import type { listFindingsQuerySchema } from "../validation/transcripts.js";

type ListFindingsQuery = z.infer<typeof listFindingsQuerySchema>;

export async function listFindings(params: { organizationId: string; query: ListFindingsQuery }) {
  const db = getTranscriptionQADb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.finding.findMany({
        where: {
          organizationId: params.organizationId,
          ...(params.query.transcriptId ? { transcriptId: params.query.transcriptId } : {}),
          ...(params.query.status ? { status: params.query.status } : {}),
          ...(params.query.category ? { category: params.query.category } : {}),
        },
        include: { segment: true, transcript: true },
        orderBy: { createdAt: "desc" },
        ...args,
      }),
  });
}

export async function getFinding(params: { organizationId: string; findingId: string }) {
  const db = getTranscriptionQADb();
  return db.finding.findFirst({
    where: { id: params.findingId, organizationId: params.organizationId },
    include: { segment: true, transcript: true },
  });
}

export async function updateFindingStatus(params: { organizationId: string; findingId: string; status: string }) {
  const db = getTranscriptionQADb();
  const result = await db.finding.updateMany({
    where: { id: params.findingId, organizationId: params.organizationId },
    data: { status: params.status, resolvedAt: params.status === "resolved" ? new Date() : null },
  });
  if (result.count === 0) {
    throw new PlatformError("NOT_FOUND", "Finding not found.");
  }
  return getFinding({ organizationId: params.organizationId, findingId: params.findingId });
}
