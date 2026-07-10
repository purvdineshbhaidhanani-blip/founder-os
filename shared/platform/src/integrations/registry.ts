import { getPlatformDb, currentAppId } from "../db/index.js";
import { encryptAtRest, decryptAtRest } from "../crypto/index.js";
import { notFoundError } from "../errors/index.js";
import { recordAuditLogEntry } from "../audit/index.js";
import { requireCan, type RbacActor } from "../organizations/rbac.js";

/**
 * Integration registry per frameworks/12-integrations.md: credentials
 * env-only for platform-level integrations (OAuth login providers, Stripe,
 * email) but per-organization for product integrations (a customer's own
 * Salesforce/Slack connection) — those are stored here, encrypted, never
 * as plaintext or as process-level env vars.
 */
export async function connectIntegration(params: {
  organizationId: string;
  actor: RbacActor;
  provider: string;
  credentials: Record<string, unknown>;
  config?: Record<string, unknown>;
}) {
  await requireCan(params.actor, "settings.manage");
  const db = getPlatformDb();

  const integration = await db.integration.upsert({
    where: { uq_integrations_org_provider: { organizationId: params.organizationId, provider: params.provider } },
    create: {
      appId: currentAppId(),
      organizationId: params.organizationId,
      connectedById: params.actor.userId,
      provider: params.provider,
      status: "connected",
      encryptedCredentials: encryptAtRest(JSON.stringify(params.credentials)),
      config: (params.config ?? {}) as never,
      connectedAt: new Date(),
    },
    update: {
      status: "connected",
      connectedById: params.actor.userId,
      encryptedCredentials: encryptAtRest(JSON.stringify(params.credentials)),
      config: (params.config ?? {}) as never,
      connectedAt: new Date(),
    },
  });

  await recordAuditLogEntry({
    organizationId: params.organizationId,
    actorId: params.actor.userId,
    action: "integration.connected",
    targetType: "integration",
    targetId: integration.id,
    metadata: { provider: params.provider },
  });

  return { id: integration.id, provider: integration.provider, status: integration.status };
}

export async function disconnectIntegration(params: { organizationId: string; provider: string; actor: RbacActor }): Promise<void> {
  await requireCan(params.actor, "settings.manage");
  const db = getPlatformDb();

  const integration = await db.integration.findUnique({
    where: { uq_integrations_org_provider: { organizationId: params.organizationId, provider: params.provider } },
  });
  if (!integration) throw notFoundError("Integration");

  await db.integration.update({
    where: { id: integration.id },
    data: { status: "disabled", encryptedCredentials: null },
  });

  await recordAuditLogEntry({
    organizationId: params.organizationId,
    actorId: params.actor.userId,
    action: "integration.disconnected",
    targetType: "integration",
    targetId: integration.id,
    metadata: { provider: params.provider },
  });
}

export async function listIntegrations(params: { organizationId: string; actor: RbacActor }) {
  await requireCan(params.actor, "organization.view");
  return getPlatformDb().integration.findMany({
    where: { organizationId: params.organizationId },
    select: { id: true, provider: true, status: true, connectedAt: true, config: true },
    orderBy: { provider: "asc" },
  });
}

/** Returns decrypted credentials for internal platform use (e.g. notifications/channels.ts posting to a Slack webhook) — never exposed directly over an API response. */
export async function getIntegrationCredentials<T = Record<string, unknown>>(organizationId: string, provider: string): Promise<T | null> {
  const integration = await getPlatformDb().integration.findUnique({
    where: { uq_integrations_org_provider: { organizationId, provider } },
  });
  if (!integration || integration.status !== "connected" || !integration.encryptedCredentials) return null;
  return JSON.parse(decryptAtRest(integration.encryptedCredentials)) as T;
}
