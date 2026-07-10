import type { Prisma } from "@prisma/client";
import { getPlatformDb } from "../db/index.js";
import { currentAppId } from "../db/index.js";

/**
 * Append-only audit log per standards/security.md: "security-relevant
 * events... are written to an append-only audit log distinct from general
 * application logs." Every mutation in auth/users/organizations calls this
 * — never logged inline ad hoc, so the record is complete and consistent.
 *
 * Per standards/security.md, entries record actor/action/target/timestamp/
 * IP — never the payload of sensitive data itself. `metadata` is for
 * non-sensitive context only (e.g. { previousRole: "member", newRole: "admin" }),
 * never passwords, tokens, or full payment details.
 */
export async function recordAuditLogEntry(params: {
  organizationId?: string;
  actorId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await getPlatformDb().auditLogEntry.create({
    data: {
      appId: currentAppId(),
      organizationId: params.organizationId,
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      ipAddress: params.ipAddress,
      metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export async function listAuditLogForOrganization(params: {
  organizationId: string;
  cursor?: string;
  limit?: number;
}) {
  const limit = Math.min(params.limit ?? 20, 100);
  const entries = await getPlatformDb().auditLogEntry.findMany({
    where: { organizationId: params.organizationId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
  });

  const hasMore = entries.length > limit;
  const page = hasMore ? entries.slice(0, limit) : entries;

  return {
    data: page,
    pagination: {
      nextCursor: hasMore ? page[page.length - 1]?.id : undefined,
      hasMore,
    },
  };
}
