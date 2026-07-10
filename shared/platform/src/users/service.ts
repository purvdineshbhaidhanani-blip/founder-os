import type { Prisma, UserStatus } from "@prisma/client";
import { getPlatformDb, currentAppId } from "../db/index.js";
import { notFoundError, unauthorizedError } from "../errors/index.js";
import { recordAuditLogEntry } from "../audit/index.js";
import type { UpdateProfileInput, SetAvatarInput, UpdateAccountSettingsInput } from "./validation.js";

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  settings: Prisma.JsonValue;
  createdAt: Date;
  lastLoginAt: Date | null;
}

const PROFILE_SELECT = {
  id: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  status: true,
  emailVerifiedAt: true,
  settings: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

export async function getProfile(userId: string): Promise<UserProfile> {
  const user = await getPlatformDb().user.findFirst({
    where: { id: userId, appId: currentAppId(), deletedAt: null },
    select: PROFILE_SELECT,
  });
  if (!user) throw notFoundError("User");
  return user;
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
  const db = getPlatformDb();
  await requireExistingUser(userId);

  const user = await db.user.update({
    where: { id: userId },
    data: {
      ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
      ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
    },
    select: PROFILE_SELECT,
  });

  await recordAuditLogEntry({ actorId: userId, action: "user.profile_updated", targetType: "user", targetId: userId });
  return user;
}

export async function setAvatar(userId: string, input: SetAvatarInput): Promise<UserProfile> {
  const db = getPlatformDb();
  await requireExistingUser(userId);

  const user = await db.user.update({
    where: { id: userId },
    data: { avatarUrl: input.avatarUrl },
    select: PROFILE_SELECT,
  });

  await recordAuditLogEntry({ actorId: userId, action: "user.avatar_updated", targetType: "user", targetId: userId });
  return user;
}

export async function getAccountSettings(userId: string): Promise<Prisma.JsonValue> {
  const user = await requireExistingUser(userId);
  return user.settings;
}

export async function updateAccountSettings(
  userId: string,
  input: UpdateAccountSettingsInput,
): Promise<Prisma.JsonValue> {
  const db = getPlatformDb();
  const existing = await requireExistingUser(userId);

  const currentSettings =
    existing.settings && typeof existing.settings === "object" && !Array.isArray(existing.settings)
      ? (existing.settings as Record<string, unknown>)
      : {};

  const merged = {
    ...currentSettings,
    ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
    ...(input.locale !== undefined ? { locale: input.locale } : {}),
    ...(input.emailNotificationsEnabled !== undefined
      ? { emailNotificationsEnabled: input.emailNotificationsEnabled }
      : {}),
  };

  const user = await db.user.update({
    where: { id: userId },
    data: { settings: merged as Prisma.InputJsonValue },
    select: { settings: true },
  });

  await recordAuditLogEntry({ actorId: userId, action: "user.settings_updated", targetType: "user", targetId: userId });
  return user.settings;
}

/**
 * Status transitions are audited explicitly (not folded into a generic
 * "update") because suspend/deactivate are security-relevant admin actions
 * per standards/security.md ("admin action on another user's data").
 * Authorization (only an org owner/admin may call this on someone else) is
 * enforced by the caller via organizations/rbac.ts's `can()` — this
 * function trusts that check has already happened.
 */
export async function setUserStatus(params: {
  userId: string;
  status: UserStatus;
  actorId: string;
}): Promise<UserProfile> {
  const db = getPlatformDb();
  await requireExistingUser(params.userId);

  const user = await db.user.update({
    where: { id: params.userId },
    data: { status: params.status },
    select: PROFILE_SELECT,
  });

  await recordAuditLogEntry({
    actorId: params.actorId,
    action: `user.status_changed_to_${params.status}`,
    targetType: "user",
    targetId: params.userId,
  });

  return user;
}

/** Soft delete per standards/database.md — never a hard delete from application code. */
export async function softDeleteUser(params: { userId: string; actorId: string }): Promise<void> {
  const db = getPlatformDb();
  await requireExistingUser(params.userId);

  await db.user.update({
    where: { id: params.userId },
    data: { deletedAt: new Date(), status: "deactivated" },
  });

  await recordAuditLogEntry({ actorId: params.actorId, action: "user.deleted", targetType: "user", targetId: params.userId });
}

async function requireExistingUser(userId: string) {
  const user = await getPlatformDb().user.findFirst({
    where: { id: userId, appId: currentAppId(), deletedAt: null },
  });
  if (!user) throw notFoundError("User");
  return user;
}

export function assertSelfOrThrow(actorId: string, targetUserId: string): void {
  if (actorId !== targetUserId) {
    throw unauthorizedError("You can only modify your own account.");
  }
}
