import type { Prisma } from "@prisma/client";
import { getPlatformDb } from "../db/index.js";
import { notFoundError } from "../errors/index.js";
import { requireCan, type RbacActor } from "../organizations/rbac.js";
import { recordAuditLogEntry } from "../audit/index.js";

/**
 * Org-level settings (branding, integrations preferences, theme default,
 * language default), stored as JSON on Organization.settings — same
 * "avoid a migration per new setting" pattern as User.settings
 * (users/service.ts), scoped by the same RBAC check every other org
 * mutation uses.
 */
export async function getOrganizationSettings(organizationId: string): Promise<Prisma.JsonValue> {
  const org = await getPlatformDb().organization.findUnique({ where: { id: organizationId }, select: { settings: true } });
  if (!org) throw notFoundError("Organization");
  return org.settings;
}

export async function updateOrganizationSettings(params: {
  organizationId: string;
  actor: RbacActor;
  patch: Record<string, unknown>;
}): Promise<Prisma.JsonValue> {
  await requireCan(params.actor, "settings.manage");
  const db = getPlatformDb();

  const org = await db.organization.findUnique({ where: { id: params.organizationId }, select: { settings: true } });
  if (!org) throw notFoundError("Organization");

  const currentSettings = org.settings && typeof org.settings === "object" && !Array.isArray(org.settings) ? (org.settings as Record<string, unknown>) : {};
  const merged = { ...currentSettings, ...params.patch };

  const updated = await db.organization.update({
    where: { id: params.organizationId },
    data: { settings: merged as Prisma.InputJsonValue },
    select: { settings: true },
  });

  await recordAuditLogEntry({
    organizationId: params.organizationId,
    actorId: params.actor.userId,
    action: "organization.settings_updated",
    targetType: "organization",
    targetId: params.organizationId,
  });

  return updated.settings;
}
