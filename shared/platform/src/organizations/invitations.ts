import { randomBytes, createHash } from "node:crypto";
import { getPlatformDb, currentAppId } from "../db/index.js";
import { conflictError, notFoundError, unauthenticatedError } from "../errors/index.js";
import { integrationNotConfiguredError } from "../errors/index.js";
import { isEmailConfigured } from "../config/index.js";
import { recordAuditLogEntry } from "../audit/index.js";
import { requireCan, type RbacActor } from "./rbac.js";
import type { InviteMemberInput } from "./validation.js";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface CreatedInvitation {
  invitationId: string;
  /** Raw token — returned once, embedded in the invite email/link by the product route handler. */
  token: string;
  expiresAt: Date;
}

export async function inviteMember(params: {
  organizationId: string;
  actor: RbacActor;
  input: InviteMemberInput;
}): Promise<CreatedInvitation> {
  await requireCan(params.actor, "member.invite");

  if (!isEmailConfigured()) {
    throw integrationNotConfiguredError("Transactional email");
  }

  const db = getPlatformDb();
  const appId = currentAppId();

  const existingUser = await db.user.findUnique({
    where: { uq_users_app_id_email: { appId, email: params.input.email } },
  });
  if (existingUser) {
    const existingMembership = await db.organizationMember.findUnique({
      where: { uq_organization_members_org_user: { organizationId: params.organizationId, userId: existingUser.id } },
    });
    if (existingMembership) {
      throw conflictError("This person is already a member of the organization.");
    }
  }

  const pending = await db.invitation.findFirst({
    where: { organizationId: params.organizationId, email: params.input.email, status: "pending" },
  });
  if (pending) {
    throw conflictError("An invitation is already pending for this email.");
  }

  const token = randomBytes(32).toString("base64url");
  const invitation = await db.invitation.create({
    data: {
      organizationId: params.organizationId,
      email: params.input.email,
      role: params.input.role,
      productRole: params.input.productRole,
      tokenHash: hashToken(token),
      invitedById: params.actor.userId,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    },
  });

  await recordAuditLogEntry({
    organizationId: params.organizationId,
    actorId: params.actor.userId,
    action: "invitation.created",
    targetType: "invitation",
    targetId: invitation.id,
    metadata: { email: params.input.email, role: params.input.role },
  });

  return { invitationId: invitation.id, token, expiresAt: invitation.expiresAt };
}

export interface AcceptedInvitation {
  userId: string;
  organizationId: string;
}

/**
 * Accepting an invitation both confirms the invitee's identity (they had
 * the token, delivered only to their email) and grants membership in one
 * transaction — there is no window where a user exists without the
 * membership the invitation promised, or vice versa.
 */
export async function acceptInvitation(params: {
  token: string;
  /** The authenticated user accepting, if they already have an account; undefined triggers account creation from the invite email. */
  authenticatedUserId?: string;
}): Promise<AcceptedInvitation> {
  const db = getPlatformDb();
  const tokenHash = hashToken(params.token);

  const invitation = await db.invitation.findUnique({ where: { tokenHash } });
  if (!invitation || invitation.status !== "pending" || invitation.expiresAt < new Date()) {
    throw unauthenticatedError("This invitation is invalid or has expired.");
  }

  const appId = currentAppId();

  const result = await db.$transaction(async (tx) => {
    let userId = params.authenticatedUserId;

    if (!userId) {
      const user = await tx.user.upsert({
        where: { uq_users_app_id_email: { appId, email: invitation.email } },
        create: {
          appId,
          email: invitation.email,
          displayName: invitation.email.split("@")[0] ?? invitation.email,
          status: "invited",
        },
        update: {},
      });
      userId = user.id;
    }

    await tx.organizationMember.upsert({
      where: { uq_organization_members_org_user: { organizationId: invitation.organizationId, userId } },
      create: {
        organizationId: invitation.organizationId,
        userId,
        role: invitation.role,
        productRole: invitation.productRole,
      },
      update: { role: invitation.role, productRole: invitation.productRole },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: "accepted", acceptedAt: new Date() },
    });

    return { userId, organizationId: invitation.organizationId };
  });

  await recordAuditLogEntry({
    organizationId: invitation.organizationId,
    actorId: result.userId,
    action: "invitation.accepted",
    targetType: "invitation",
    targetId: invitation.id,
  });

  return result;
}

export async function revokeInvitation(params: { invitationId: string; actor: RbacActor }): Promise<void> {
  await requireCan(params.actor, "member.invite");

  const invitation = await getPlatformDb().invitation.findUnique({ where: { id: params.invitationId } });
  if (!invitation || invitation.organizationId !== params.actor.organizationId) {
    throw notFoundError("Invitation");
  }

  await getPlatformDb().invitation.update({
    where: { id: params.invitationId },
    data: { status: "revoked" },
  });

  await recordAuditLogEntry({
    organizationId: params.actor.organizationId,
    actorId: params.actor.userId,
    action: "invitation.revoked",
    targetType: "invitation",
    targetId: params.invitationId,
  });
}

export async function listPendingInvitations(params: { organizationId: string; actor: RbacActor }) {
  await requireCan(params.actor, "member.view");
  return getPlatformDb().invitation.findMany({
    where: { organizationId: params.organizationId, status: "pending" },
    orderBy: { createdAt: "desc" },
  });
}
