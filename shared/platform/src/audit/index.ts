import type { Prisma } from "@prisma/client";
import { getPlatformDb } from "../db/index.js";
import { currentAppId } from "../db/index.js";
import { paginate } from "../api/pagination.js";

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
  return paginate({
    cursor: params.cursor,
    limit: params.limit,
    findMany: (args) =>
      getPlatformDb().auditLogEntry.findMany({
        where: { organizationId: params.organizationId },
        orderBy: { createdAt: "desc" },
        ...args,
      }),
  });
}
