import type { Prisma } from "@prisma/client";
import { getPlatformDb, currentAppId } from "../db/index.js";
import { conflictError, notFoundError } from "../errors/index.js";
import { recordAuditLogEntry } from "../audit/index.js";
import { requireCan, type RbacActor } from "./rbac.js";
import type { CreateOrganizationInput, UpdateOrganizationInput, CreateTeamInput } from "./validation.js";

export async function createOrganization(params: { creatorUserId: string; input: CreateOrganizationInput }) {
  const db = getPlatformDb();
  const appId = currentAppId();

  const existing = await db.organization.findUnique({
    where: { uq_organizations_app_id_slug: { appId, slug: params.input.slug } },
  });
  if (existing) throw conflictError("An organization with this slug already exists.");

  const organization = await db.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { appId, name: params.input.name, slug: params.input.slug },
    });
    // Creator is always the first owner — never created without one, so an
    // organization can never exist with zero members who can manage it.
    await tx.organizationMember.create({
      data: { organizationId: org.id, userId: params.creatorUserId, role: "owner" },
    });
    return org;
  });

  await recordAuditLogEntry({
    organizationId: organization.id,
    actorId: params.creatorUserId,
    action: "organization.created",
    targetType: "organization",
    targetId: organization.id,
  });

  return organization;
}

export async function getOrganization(params: { organizationId: string; actor: RbacActor }) {
  await requireCan(params.actor, "organization.view");
  const org = await getPlatformDb().organization.findFirst({
    where: { id: params.organizationId, appId: currentAppId(), deletedAt: null },
  });
  if (!org) throw notFoundError("Organization");
  return org;
}

export async function updateOrganization(params: {
  organizationId: string;
  actor: RbacActor;
  input: UpdateOrganizationInput;
}) {
  await requireCan(params.actor, "organization.update");
  const db = getPlatformDb();

  const org = await db.organization.update({
    where: { id: params.organizationId },
    data: {
      ...(params.input.name !== undefined ? { name: params.input.name } : {}),
      ...(params.input.settings !== undefined ? { settings: params.input.settings as Prisma.InputJsonValue } : {}),
    },
  });

  await recordAuditLogEntry({
    organizationId: params.organizationId,
    actorId: params.actor.userId,
    action: "organization.updated",
    targetType: "organization",
    targetId: params.organizationId,
  });

  return org;
}

/** Soft delete per standards/database.md; org data (billing history, audit log) survives for compliance. */
export async function deleteOrganization(params: { organizationId: string; actor: RbacActor }) {
  await requireCan(params.actor, "organization.delete");
  await getPlatformDb().organization.update({
    where: { id: params.organizationId },
    data: { deletedAt: new Date() },
  });

  await recordAuditLogEntry({
    organizationId: params.organizationId,
    actorId: params.actor.userId,
    action: "organization.deleted",
    targetType: "organization",
    targetId: params.organizationId,
  });
}

export async function listOrganizationsForUser(userId: string) {
  const memberships = await getPlatformDb().organizationMember.findMany({
    where: { userId, organization: { appId: currentAppId(), deletedAt: null } },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({ organization: m.organization, role: m.role, productRole: m.productRole }));
}

export async function createTeam(params: { organizationId: string; actor: RbacActor; input: CreateTeamInput }) {
  await requireCan(params.actor, "team.create");
  const team = await getPlatformDb().team.create({
    data: { organizationId: params.organizationId, name: params.input.name },
  });

  await recordAuditLogEntry({
    organizationId: params.organizationId,
    actorId: params.actor.userId,
    action: "team.created",
    targetType: "team",
    targetId: team.id,
  });

  return team;
}

export async function listTeams(params: { organizationId: string; actor: RbacActor }) {
  await requireCan(params.actor, "organization.view");
  return getPlatformDb().team.findMany({
    where: { organizationId: params.organizationId, deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
}

export async function addTeamMember(params: { teamId: string; userId: string; actor: RbacActor }) {
  await requireCan(params.actor, "team.manage_members");
  const member = await getPlatformDb().teamMember.create({
    data: { teamId: params.teamId, userId: params.userId },
  });

  await recordAuditLogEntry({
    organizationId: params.actor.organizationId,
    actorId: params.actor.userId,
    action: "team.member_added",
    targetType: "team",
    targetId: params.teamId,
    metadata: { userId: params.userId },
  });

  return member;
}

export async function removeTeamMember(params: { teamId: string; userId: string; actor: RbacActor }) {
  await requireCan(params.actor, "team.manage_members");
  await getPlatformDb().teamMember.delete({
    where: { uq_team_members_team_user: { teamId: params.teamId, userId: params.userId } },
  });

  await recordAuditLogEntry({
    organizationId: params.actor.organizationId,
    actorId: params.actor.userId,
    action: "team.member_removed",
    targetType: "team",
    targetId: params.teamId,
    metadata: { userId: params.userId },
  });
}

export async function listOrganizationMembers(params: { organizationId: string; actor: RbacActor }) {
  await requireCan(params.actor, "member.view");
  return getPlatformDb().organizationMember.findMany({
    where: { organizationId: params.organizationId },
    include: { user: { select: { id: true, email: true, displayName: true, avatarUrl: true, status: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function updateMemberRole(params: {
  organizationId: string;
  targetUserId: string;
  role: "owner" | "admin" | "member";
  productRole?: string | null;
  actor: RbacActor;
}) {
  await requireCan(params.actor, "member.update_role");

  const previous = await getPlatformDb().organizationMember.findUnique({
    where: { uq_organization_members_org_user: { organizationId: params.organizationId, userId: params.targetUserId } },
  });
  if (!previous) throw notFoundError("Organization member");

  const updated = await getPlatformDb().organizationMember.update({
    where: { uq_organization_members_org_user: { organizationId: params.organizationId, userId: params.targetUserId } },
    data: {
      role: params.role,
      ...(params.productRole !== undefined ? { productRole: params.productRole } : {}),
    },
  });

  await recordAuditLogEntry({
    organizationId: params.organizationId,
    actorId: params.actor.userId,
    action: "member.role_changed",
    targetType: "organization_member",
    targetId: params.targetUserId,
    metadata: { previousRole: previous.role, newRole: params.role },
  });

  return updated;
}

export async function removeMember(params: { organizationId: string; targetUserId: string; actor: RbacActor }) {
  await requireCan(params.actor, "member.remove");

  await getPlatformDb().organizationMember.delete({
    where: { uq_organization_members_org_user: { organizationId: params.organizationId, userId: params.targetUserId } },
  });

  await recordAuditLogEntry({
    organizationId: params.organizationId,
    actorId: params.actor.userId,
    action: "member.removed",
    targetType: "organization_member",
    targetId: params.targetUserId,
  });
}
