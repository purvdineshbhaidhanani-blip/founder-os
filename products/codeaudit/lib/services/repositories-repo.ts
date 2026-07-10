import { paginate } from "@founder-os/platform/api";
import { getCodeAuditDb } from "../db.js";
import type { z } from "zod";
import type { createRepositorySchema, listRepositoriesQuerySchema } from "../validation/repositories.js";

type CreateRepositoryInput = z.infer<typeof createRepositorySchema>;
type ListRepositoriesQuery = z.infer<typeof listRepositoriesQuerySchema>;

export async function createRepository(params: { organizationId: string; createdByUserId: string; input: CreateRepositoryInput }) {
  const db = getCodeAuditDb();
  return db.repository.create({
    data: {
      organizationId: params.organizationId,
      name: params.input.name,
      defaultBranch: params.input.defaultBranch,
      visibility: params.input.visibility,
      createdByUserId: params.createdByUserId,
    },
  });
}

export async function listRepositories(params: { organizationId: string; query: ListRepositoriesQuery }) {
  const db = getCodeAuditDb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.repository.findMany({
        where: { organizationId: params.organizationId },
        orderBy: { createdAt: "desc" },
        ...args,
      }),
  });
}

export async function getRepository(params: { organizationId: string; repositoryId: string }) {
  const db = getCodeAuditDb();
  return db.repository.findFirst({ where: { id: params.repositoryId, organizationId: params.organizationId } });
}

export async function countRepositories(params: { organizationId: string; visibility: "private" | "public" }) {
  const db = getCodeAuditDb();
  return db.repository.count({ where: { organizationId: params.organizationId, visibility: params.visibility } });
}
