import { randomBytes, createHash } from "node:crypto";
import { getPlatformDb, currentAppId } from "../db/index.js";
import { notFoundError, unauthenticatedError } from "../errors/index.js";
import { recordAuditLogEntry } from "../audit/index.js";
import { requireCan, type RbacActor } from "../organizations/rbac.js";

/**
 * Public API tokens per standards/api.md: "scoped, revocable, and never
 * equal to a user's session credential." A key is shown once at creation
 * (`rawKey`) and never again — only its prefix and hash are stored.
 */

const KEY_BYTE_LENGTH = 24;
const PREFIX_DISPLAY_LENGTH = 8;

function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export interface CreatedApiKey {
  id: string;
  /** The full secret — returned exactly once. */
  rawKey: string;
  keyPrefix: string;
}

export async function createApiKey(params: {
  organizationId: string;
  actor: RbacActor;
  name: string;
  scopes: string[];
  expiresAt?: Date;
}): Promise<CreatedApiKey> {
  await requireCan(params.actor, "api_key.manage");

  const secret = randomBytes(KEY_BYTE_LENGTH).toString("base64url");
  const rawKey = `sk_${secret}`;
  const keyPrefix = rawKey.slice(0, PREFIX_DISPLAY_LENGTH);

  const record = await getPlatformDb().apiKey.create({
    data: {
      appId: currentAppId(),
      organizationId: params.organizationId,
      createdById: params.actor.userId,
      name: params.name,
      keyPrefix,
      keyHash: hashKey(rawKey),
      scopes: params.scopes,
      expiresAt: params.expiresAt,
    },
  });

  await recordAuditLogEntry({
    organizationId: params.organizationId,
    actorId: params.actor.userId,
    action: "api_key.created",
    targetType: "api_key",
    targetId: record.id,
    metadata: { name: params.name, keyPrefix },
  });

  return { id: record.id, rawKey, keyPrefix };
}

export interface VerifiedApiKey {
  id: string;
  organizationId: string;
  scopes: string[];
}

/** Verifies a raw API key from an Authorization header, checking expiry/revocation. Never throws for "not found" — returns null so callers 401 uniformly. */
export async function verifyApiKey(rawKey: string): Promise<VerifiedApiKey | null> {
  const record = await getPlatformDb().apiKey.findUnique({ where: { keyHash: hashKey(rawKey) } });

  if (!record || record.revokedAt || (record.expiresAt && record.expiresAt < new Date())) {
    return null;
  }

  await getPlatformDb().apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    id: record.id,
    organizationId: record.organizationId,
    scopes: Array.isArray(record.scopes) ? (record.scopes as string[]) : [],
  };
}

export async function requireApiKeyScope(key: VerifiedApiKey, scope: string): Promise<void> {
  if (!key.scopes.includes(scope) && !key.scopes.includes("*")) {
    throw unauthenticatedError(`API key does not have the "${scope}" scope.`);
  }
}

export async function listApiKeys(params: { organizationId: string; actor: RbacActor }) {
  await requireCan(params.actor, "api_key.manage");
  return getPlatformDb().apiKey.findMany({
    where: { organizationId: params.organizationId },
    select: { id: true, name: true, keyPrefix: true, scopes: true, lastUsedAt: true, expiresAt: true, revokedAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeApiKey(params: { keyId: string; actor: RbacActor }): Promise<void> {
  await requireCan(params.actor, "api_key.manage");

  const key = await getPlatformDb().apiKey.findUnique({ where: { id: params.keyId } });
  if (!key || key.organizationId !== params.actor.organizationId) throw notFoundError("API key");

  await getPlatformDb().apiKey.update({ where: { id: params.keyId }, data: { revokedAt: new Date() } });

  await recordAuditLogEntry({
    organizationId: params.actor.organizationId,
    actorId: params.actor.userId,
    action: "api_key.revoked",
    targetType: "api_key",
    targetId: params.keyId,
  });
}
