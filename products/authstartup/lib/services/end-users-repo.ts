import { randomBytes, createHash } from "node:crypto";
import argon2 from "argon2";
import { PlatformError } from "@founder-os/platform/errors";
import { withinLimit } from "@founder-os/platform/billing";
import { getAuthStartupDb } from "../db.js";
import type { z } from "zod";
import type { loginEndUserSchema, registerEndUserSchema } from "../validation/end-users.js";

type RegisterEndUserInput = z.infer<typeof registerEndUserSchema>;
type LoginEndUserInput = z.infer<typeof loginEndUserSchema>;

function hashSessionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

async function issueSession(params: { projectId: string; endUserId: string; sessionTtlMinutes: number }) {
  const db = getAuthStartupDb();
  const rawToken = randomBytes(32).toString("hex");
  await db.endUserSession.create({
    data: {
      projectId: params.projectId,
      endUserId: params.endUserId,
      tokenHash: hashSessionToken(rawToken),
      expiresAt: new Date(Date.now() + params.sessionTtlMinutes * 60 * 1000),
    },
  });
  return rawToken;
}

/** Registers a new end user for a project resolved via API key — the public-facing half of AuthStartup's auth-as-a-service API, per products/authstartup/docs/PRODUCT_IDENTITY.md §7 "Email/password authentication." */
export async function registerEndUser(params: { organizationId: string; projectId: string; sessionTtlMinutes: number; input: RegisterEndUserInput }) {
  const db = getAuthStartupDb();

  const limitCheck = await withinLimit(params.organizationId, "monthly_active_users");
  const currentCount = await db.endUser.count({ where: { projectId: params.projectId } });
  if (!limitCheck.allowed || (limitCheck.limit !== null && currentCount >= limitCheck.limit)) {
    throw new PlatformError("UNAUTHORIZED", `This project has reached its plan's limit of ${limitCheck.limit} monthly active users.`);
  }

  const existing = await db.endUser.findUnique({ where: { projectId_email: { projectId: params.projectId, email: params.input.email } } });
  if (existing) {
    throw new PlatformError("CONFLICT", "An end user with this email already exists in this project.");
  }

  const passwordHash = await argon2.hash(params.input.password);
  const endUser = await db.endUser.create({
    data: { projectId: params.projectId, email: params.input.email, passwordHash },
  });

  const token = await issueSession({ projectId: params.projectId, endUserId: endUser.id, sessionTtlMinutes: params.sessionTtlMinutes });
  return { endUserId: endUser.id, email: endUser.email, token };
}

export async function loginEndUser(params: { projectId: string; sessionTtlMinutes: number; input: LoginEndUserInput }) {
  const db = getAuthStartupDb();
  const endUser = await db.endUser.findUnique({ where: { projectId_email: { projectId: params.projectId, email: params.input.email } } });

  const success = endUser ? await argon2.verify(endUser.passwordHash, params.input.password) : false;

  if (endUser) {
    await db.loginEvent.create({ data: { projectId: params.projectId, endUserId: endUser.id, success } });
  }

  if (!endUser || !success) {
    throw new PlatformError("UNAUTHENTICATED", "Invalid email or password.");
  }

  const token = await issueSession({ projectId: params.projectId, endUserId: endUser.id, sessionTtlMinutes: params.sessionTtlMinutes });
  return { endUserId: endUser.id, email: endUser.email, token };
}

export async function listEndUsers(params: { organizationId: string; projectId: string }) {
  const db = getAuthStartupDb();
  return db.endUser.findMany({ where: { projectId: params.projectId }, orderBy: { createdAt: "desc" } });
}

export async function listSessionsForEndUser(params: { projectId: string; endUserId: string }) {
  const db = getAuthStartupDb();
  return db.endUserSession.findMany({
    where: { projectId: params.projectId, endUserId: params.endUserId, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeSession(params: { projectId: string; sessionId: string }) {
  const db = getAuthStartupDb();
  await db.endUserSession.updateMany({
    where: { id: params.sessionId, projectId: params.projectId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
