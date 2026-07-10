import type { Prisma } from "@prisma/client";
import { getPlatformDb } from "../db/index.js";
import { notFoundError, unauthorizedError } from "../errors/index.js";

export async function createSavedFilter(params: {
  organizationId: string;
  userId: string;
  name: string;
  resourceType: string;
  filter: Record<string, unknown>;
}) {
  return getPlatformDb().savedFilter.create({
    data: {
      organizationId: params.organizationId,
      userId: params.userId,
      name: params.name,
      resourceType: params.resourceType,
      filter: params.filter as Prisma.InputJsonValue,
    },
  });
}

export async function listSavedFilters(params: { organizationId: string; userId: string; resourceType: string }) {
  return getPlatformDb().savedFilter.findMany({
    where: { organizationId: params.organizationId, userId: params.userId, resourceType: params.resourceType },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteSavedFilter(params: { savedFilterId: string; userId: string }): Promise<void> {
  const db = getPlatformDb();
  const filter = await db.savedFilter.findUnique({ where: { id: params.savedFilterId } });
  if (!filter) throw notFoundError("Saved filter");
  if (filter.userId !== params.userId) throw unauthorizedError();

  await db.savedFilter.delete({ where: { id: params.savedFilterId } });
}
