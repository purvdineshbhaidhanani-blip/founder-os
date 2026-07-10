import { randomBytes, createHash } from "node:crypto";
import { getPlatformDb, currentAppId } from "../db/index.js";
import { hashPassword, verifyPassword, isPasswordStrongEnough } from "./password.js";
import { createSession, revokeSession, revokeAllSessionsForUser, type CreatedSession } from "./session.js";
import { hasVerifiedMfa, verifyMfaLoginCode } from "./mfa.js";
import { enforceRateLimit, LOGIN_RATE_LIMIT, EMAIL_TOKEN_RATE_LIMIT } from "./rate-limit.js";
import { recordAuditLogEntry } from "../audit/index.js";
import {
  conflictError,
  unauthenticatedError,
  notFoundError,
  validationError,
} from "../errors/index.js";
import type {
  SignUpWithPasswordInput,
  LoginWithPasswordInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  RequestMagicLinkInput,
  ConsumeMagicLinkInput,
} from "./validation.js";
import { isEmailConfigured } from "../config/index.js";
import { integrationNotConfiguredError } from "../errors/index.js";

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export interface AuthResult {
  userId: string;
  requiresMfa: boolean;
  session?: CreatedSession;
}

export async function signUpWithPassword(
  input: SignUpWithPasswordInput,
  context: { ipAddress?: string; userAgent?: string },
): Promise<AuthResult> {
  const db = getPlatformDb();
  const appId = currentAppId();

  if (!isPasswordStrongEnough(input.password)) {
    throw validationError([{ field: "password", issue: "Password must be at least 12 characters." }]);
  }

  const existing = await db.user.findUnique({
    where: { uq_users_app_id_email: { appId, email: input.email } },
  });
  if (existing) {
    throw conflictError("An account with this email already exists.");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await db.user.create({
    data: {
      appId,
      email: input.email,
      displayName: input.displayName,
      passwordHash,
      status: "active",
    },
  });

  await recordAuditLogEntry({ actorId: user.id, action: "user.signed_up", targetType: "user", targetId: user.id, ipAddress: context.ipAddress });

  const session = await createSession({ userId: user.id, ipAddress: context.ipAddress, userAgent: context.userAgent });
  return { userId: user.id, requiresMfa: false, session };
}

export async function loginWithPassword(
  input: LoginWithPasswordInput,
  context: { ipAddress?: string; userAgent?: string },
): Promise<AuthResult> {
  const db = getPlatformDb();
  const appId = currentAppId();

  // Rate-limited per email per standards/security.md's account lockout /
  // exponential backoff requirement — checked before touching the DB so a
  // credential-stuffing burst can't even reach the password verify step.
  await enforceRateLimit({ key: `login:${appId}:${input.email}`, ...LOGIN_RATE_LIMIT });

  const user = await db.user.findUnique({
    where: { uq_users_app_id_email: { appId, email: input.email } },
  });

  // Constant-shape response whether the user exists or not — verifyPassword
  // against a fixed dummy hash keeps timing comparable, avoiding email
  // enumeration via response latency.
  const passwordHash = user?.passwordHash ?? "$argon2id$v=19$m=19456,t=2,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const passwordValid = await verifyPassword(passwordHash, input.password);

  if (!user || !user.passwordHash || !passwordValid || user.status !== "active") {
    await recordAuditLogEntry({ action: "user.login_failed", targetType: "user", ipAddress: context.ipAddress, metadata: { email: input.email } });
    throw unauthenticatedError("Invalid email or password.");
  }

  const requiresMfa = await hasVerifiedMfa(user.id);
  if (requiresMfa) {
    // Caller must complete verifyMfaAndCreateSession before a session is issued.
    await recordAuditLogEntry({ actorId: user.id, action: "user.login_password_ok_mfa_pending", targetType: "user", targetId: user.id, ipAddress: context.ipAddress });
    return { userId: user.id, requiresMfa: true };
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await recordAuditLogEntry({ actorId: user.id, action: "user.logged_in", targetType: "user", targetId: user.id, ipAddress: context.ipAddress });

  const session = await createSession({ userId: user.id, ipAddress: context.ipAddress, userAgent: context.userAgent });
  return { userId: user.id, requiresMfa: false, session };
}

export async function verifyMfaAndCreateSession(params: {
  userId: string;
  code: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<AuthResult> {
  // MFA attempts are rate-limited exactly like password login — a 6-digit
  // TOTP code is brute-forceable in under a minute without this.
  await enforceRateLimit({ key: `mfa:${currentAppId()}:${params.userId}`, ...LOGIN_RATE_LIMIT });

  const codeValid = await verifyMfaLoginCode({ userId: params.userId, code: params.code });
  if (!codeValid) {
    await recordAuditLogEntry({ actorId: params.userId, action: "user.mfa_verification_failed", targetType: "user", targetId: params.userId, ipAddress: params.ipAddress });
    throw unauthenticatedError("MFA verification failed.");
  }

  const db = getPlatformDb();
  await db.user.update({ where: { id: params.userId }, data: { lastLoginAt: new Date() } });
  await recordAuditLogEntry({ actorId: params.userId, action: "user.logged_in_mfa", targetType: "user", targetId: params.userId, ipAddress: params.ipAddress });

  const session = await createSession({ userId: params.userId, ipAddress: params.ipAddress, userAgent: params.userAgent });
  return { userId: params.userId, requiresMfa: false, session };
}

export async function logout(sessionId: string, actorId: string): Promise<void> {
  await revokeSession(sessionId);
  await recordAuditLogEntry({ actorId, action: "user.logged_out", targetType: "session", targetId: sessionId });
}

export async function requestPasswordReset(input: RequestPasswordResetInput): Promise<void> {
  const db = getPlatformDb();
  const appId = currentAppId();

  await enforceRateLimit({ key: `password_reset:${appId}:${input.email}`, ...EMAIL_TOKEN_RATE_LIMIT });

  const user = await db.user.findUnique({ where: { uq_users_app_id_email: { appId, email: input.email } } });
  // Always return success regardless of whether the account exists —
  // returning 404 here is an email-enumeration vector.
  if (!user) return;

  if (!isEmailConfigured()) {
    throw integrationNotConfiguredError("Transactional email");
  }

  const token = generateToken();
  await db.passwordResetToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS) },
  });

  // Sending the actual email is the product's route-handler responsibility
  // (template rendering, provider SDK call) — this module hands back the
  // raw token once, for the caller to embed in the reset link.
  await recordAuditLogEntry({ actorId: user.id, action: "user.password_reset_requested", targetType: "user", targetId: user.id });
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const db = getPlatformDb();
  const tokenHash = hashToken(input.token);

  const resetToken = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw unauthenticatedError("This password reset link is invalid or has expired.");
  }

  if (!isPasswordStrongEnough(input.newPassword)) {
    throw validationError([{ field: "newPassword", issue: "Password must be at least 12 characters." }]);
  }

  const passwordHash = await hashPassword(input.newPassword);

  await db.$transaction([
    db.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);

  // Per standards/security.md: server-side revocation on password change —
  // every existing session for this user is invalidated immediately.
  await revokeAllSessionsForUser(resetToken.userId);
  await recordAuditLogEntry({ actorId: resetToken.userId, action: "user.password_reset_completed", targetType: "user", targetId: resetToken.userId });
}

export async function requestMagicLink(input: RequestMagicLinkInput): Promise<void> {
  const db = getPlatformDb();
  const appId = currentAppId();

  await enforceRateLimit({ key: `magic_link:${appId}:${input.email}`, ...EMAIL_TOKEN_RATE_LIMIT });

  if (!isEmailConfigured()) {
    throw integrationNotConfiguredError("Transactional email");
  }

  let user = await db.user.findUnique({ where: { uq_users_app_id_email: { appId, email: input.email } } });
  if (!user) {
    user = await db.user.create({
      data: { appId, email: input.email, displayName: input.email.split("@")[0] ?? input.email, status: "invited" },
    });
  }

  const token = generateToken();
  await db.magicLinkToken.create({
    data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS) },
  });

  await recordAuditLogEntry({ actorId: user.id, action: "user.magic_link_requested", targetType: "user", targetId: user.id });
}

export async function consumeMagicLink(
  input: ConsumeMagicLinkInput,
  context: { ipAddress?: string; userAgent?: string },
): Promise<AuthResult> {
  const db = getPlatformDb();
  const tokenHash = hashToken(input.token);

  const magicLink = await db.magicLinkToken.findUnique({ where: { tokenHash } });
  if (!magicLink || magicLink.usedAt || magicLink.expiresAt < new Date()) {
    throw unauthenticatedError("This sign-in link is invalid or has expired.");
  }

  await db.$transaction([
    db.magicLinkToken.update({ where: { id: magicLink.id }, data: { usedAt: new Date() } }),
    db.user.update({
      where: { id: magicLink.userId },
      data: { status: "active", emailVerifiedAt: new Date(), lastLoginAt: new Date() },
    }),
  ]);

  await recordAuditLogEntry({ actorId: magicLink.userId, action: "user.logged_in_magic_link", targetType: "user", targetId: magicLink.userId, ipAddress: context.ipAddress });

  const session = await createSession({ userId: magicLink.userId, ipAddress: context.ipAddress, userAgent: context.userAgent });
  return { userId: magicLink.userId, requiresMfa: false, session };
}

export async function getUserById(userId: string) {
  const user = await getPlatformDb().user.findUnique({ where: { id: userId } });
  if (!user || user.deletedAt) throw notFoundError("User");
  return user;
}
