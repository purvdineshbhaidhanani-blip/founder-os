import { paginate } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { withinLimit } from "@founder-os/platform/billing";
import { getAuthStartupDb } from "../db.js";
import type { z } from "zod";
import type { createProjectSchema, listProjectsQuerySchema, updateProjectSchema } from "../validation/projects.js";

type CreateProjectInput = z.infer<typeof createProjectSchema>;
type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export async function createProject(params: { organizationId: string; createdByUserId: string; input: CreateProjectInput }) {
  const db = getAuthStartupDb();

  const limitCheck = await withinLimit(params.organizationId, "projects");
  const currentCount = await db.project.count({ where: { organizationId: params.organizationId } });
  if (!limitCheck.allowed || (limitCheck.limit !== null && currentCount >= limitCheck.limit)) {
    throw new PlatformError("UNAUTHORIZED", `You've reached your plan's limit of ${limitCheck.limit} project(s). Upgrade your plan to add more.`);
  }

  return db.project.create({
    data: {
      organizationId: params.organizationId,
      name: params.input.name,
      environment: params.input.environment,
      requireMfa: params.input.requireMfa,
      sessionTtlMinutes: params.input.sessionTtlMinutes,
      createdByUserId: params.createdByUserId,
    },
  });
}

export async function listProjects(params: { organizationId: string; query: ListProjectsQuery }) {
  const db = getAuthStartupDb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.project.findMany({
        where: { organizationId: params.organizationId },
        orderBy: { createdAt: "desc" },
        ...args,
      }),
  });
}

export async function getProject(params: { organizationId: string; projectId: string }) {
  const db = getAuthStartupDb();
  return db.project.findFirst({ where: { id: params.projectId, organizationId: params.organizationId } });
}

export async function updateProject(params: { organizationId: string; projectId: string; input: UpdateProjectInput }) {
  const db = getAuthStartupDb();
  const result = await db.project.updateMany({
    where: { id: params.projectId, organizationId: params.organizationId },
    data: params.input,
  });
  if (result.count === 0) {
    throw new PlatformError("NOT_FOUND", "Project not found.");
  }
  return getProject({ organizationId: params.organizationId, projectId: params.projectId });
}
