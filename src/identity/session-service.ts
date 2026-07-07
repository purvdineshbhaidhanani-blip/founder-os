import { createHash, randomBytes } from "node:crypto";
import { createLogger } from "../utils/logger.js";
import type { IdentityStore } from "./store.js";
import type { Session } from "./types.js";

const logger = createLogger("identity.session");

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const TOKEN_BYTES = 32;

export const IDENTITY_SESSION_COOKIE = "identity_session";

export interface CreateSessionInput {
  userId: string;
  organizationId: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface IssuedSession {
  /** The raw opaque token — goes in the cookie. Never persisted or logged; only its hash is stored. */
  token: string;
  session: Session;
}

/**
 * Database-backed sessions: an opaque, high-entropy token is handed to the
 * client; only a SHA-256 hash of it is ever persisted (same principle as a
 * password hash — a database read alone can't yield a usable token). Unlike
 * the existing stateless signed-cookie session (`server/session.ts`), these
 * are revocable (`revoke`/`revokeAllForUser`) and carry the caller's current
 * organization for multi-tenant "organization switching."
 */
export class SessionService {
  constructor(
    private readonly store: IdentityStore,
    private readonly ttlMs: number = DEFAULT_TTL_MS,
  ) {}

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  async create(input: CreateSessionInput): Promise<IssuedSession> {
    const token = randomBytes(TOKEN_BYTES).toString("base64url");
    const session = await this.store.createSession({
      userId: input.userId,
      organizationId: input.organizationId,
      tokenHash: this.hashToken(token),
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
      expiresAt: new Date(Date.now() + this.ttlMs).toISOString(),
    });
    return { token, session };
  }

  /** Verifies a raw token and returns the live session, or null if missing/expired/revoked. Best-effort touches `lastSeenAt`. */
  async verify(token: string): Promise<Session | null> {
    const session = await this.store.getSessionByTokenHash(this.hashToken(token));
    if (!session) return null;
    if (session.revokedAt) return null;
    if (new Date(session.expiresAt).getTime() < Date.now()) return null;

    // Best-effort activity timestamp — must never fail the request it's attached to.
    this.store.touchSession(session.id, { lastSeenAt: new Date().toISOString() }).catch((error: unknown) => {
      logger.warn("failed to touch session lastSeenAt", { sessionId: session.id, error: error instanceof Error ? error.message : String(error) });
    });

    return session;
  }

  async switchOrganization(sessionId: string, organizationId: string | null): Promise<void> {
    await this.store.touchSession(sessionId, { lastSeenAt: new Date().toISOString(), organizationId });
  }

  async revoke(sessionId: string): Promise<void> {
    await this.store.revokeSession(sessionId);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.store.revokeAllSessionsForUser(userId);
  }
}

export function buildIdentitySessionCookieHeader(token: string, maxAgeSeconds: number = DEFAULT_TTL_MS / 1000): string {
  const attrs = ["HttpOnly", "Path=/", "SameSite=Lax", `Max-Age=${Math.floor(maxAgeSeconds)}`];
  if (process.env.NODE_ENV === "production") attrs.push("Secure");
  return `${IDENTITY_SESSION_COOKIE}=${encodeURIComponent(token)}; ${attrs.join("; ")}`;
}

export function buildClearIdentitySessionCookieHeader(): string {
  return `${IDENTITY_SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}
