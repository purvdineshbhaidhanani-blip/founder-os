import { PlatformError } from "@founder-os/platform/errors";
import { getAuthStartupDb } from "../db.js";
import { generateApiKey } from "./api-keys.js";
import type { z } from "zod";
import type { createApiKeySchema } from "../validation/projects.js";

type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

export async function createApiKey(params: { organizationId: string; projectId: string; input: CreateApiKeyInput }) {
  const db = getAuthStartupDb();
  const project = await db.project.findFirst({ where: { id: params.projectId, organizationId: params.organizationId } });
  if (!project) {
    throw new PlatformError("NOT_FOUND", "Project not found.");
  }

  const { rawKey, keyPrefix, keyHash } = generateApiKey();
  const apiKey = await db.apiKey.create({
    data: { projectId: params.projectId, name: params.input.name, keyPrefix, keyHash },
  });

  return { ...apiKey, rawKey };
}

export async function listApiKeys(params: { organizationId: string; projectId: string }) {
  const db = getAuthStartupDb();
  const project = await db.project.findFirst({ where: { id: params.projectId, organizationId: params.organizationId } });
  if (!project) {
    throw new PlatformError("NOT_FOUND", "Project not found.");
  }
  return db.apiKey.findMany({ where: { projectId: params.projectId }, orderBy: { createdAt: "desc" } });
}

export async function revokeApiKey(params: { organizationId: string; projectId: string; apiKeyId: string }) {
  const db = getAuthStartupDb();
  const project = await db.project.findFirst({ where: { id: params.projectId, organizationId: params.organizationId } });
  if (!project) {
    throw new PlatformError("NOT_FOUND", "Project not found.");
  }
  await db.apiKey.deleteMany({ where: { id: params.apiKeyId, projectId: params.projectId } });
}

/** Resolves the project a raw API key belongs to — the public end-user API's only entry point. */
export async function resolveProjectByApiKey(rawKey: string) {
  const { hashApiKey } = await import("./api-keys.js");
  const db = getAuthStartupDb();
  const apiKey = await db.apiKey.findUnique({ where: { keyHash: hashApiKey(rawKey) }, include: { project: true } });
  if (!apiKey) return null;
  await db.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
  return apiKey.project;
}
