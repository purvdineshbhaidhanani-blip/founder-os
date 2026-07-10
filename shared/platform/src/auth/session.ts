import { randomBytes, createHash } from "node:crypto";
import { getPlatformDb } from "../db/index.js";

const SESSION_TOKEN_BYTES = 32;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, sliding via lastSeenAt

export interface CreatedSession {
  /** Raw token — returned to the caller exactly once, set as an httpOnly cookie. Never stored. */
  token: string;
  sessionId: string;
  expiresAt: Date;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Sessions are opaque random tokens, not JWTs — per standards/security.md,
 * server-side revocation on logout/password change must be immediate and
 * unconditional, which an unrevocable stateless JWT can't guarantee.
 */
export async function createSession(params: {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<CreatedSession> {
  const token = randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const session = await getPlatformDb().session.create({
    data: {
      userId: params.userId,
      tokenHash,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      expiresAt,
    },
  });

  return { token, sessionId: session.id, expiresAt };
}

export interface ValidSession {
  sessionId: string;
  userId: string;
}

/** Returns null for missing, expired, or revoked sessions — callers treat null as "not authenticated." */
export async function validateSessionToken(token: string): Promise<ValidSession | null> {
  const tokenHash = hashToken(token);
  const session = await getPlatformDb().session.findUnique({ where: { tokenHash } });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }

  await getPlatformDb().session.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  });

  return { sessionId: session.id, userId: session.userId };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await getPlatformDb().session.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });
}

/** Called on password change per standards/security.md — every other session is invalidated immediately. */
export async function revokeAllSessionsForUser(userId: string, exceptSessionId?: string): Promise<void> {
  await getPlatformDb().session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

export async function listActiveSessionsForUser(userId: string) {
  return getPlatformDb().session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    select: {
      id: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      lastSeenAt: true,
      expiresAt: true,
    },
    orderBy: { lastSeenAt: "desc" },
  });
}
