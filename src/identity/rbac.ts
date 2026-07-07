import type { IncomingMessage, ServerResponse } from "node:http";
import { parseCookies } from "../server/session.js";
import { IDENTITY_SESSION_COOKIE, type SessionService } from "./session-service.js";
import type { IdentityStore } from "./store.js";
import type { Membership, Session, User } from "./types.js";

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}

/** Computes the set of permission keys a role grants — the single place "what can this role do" is resolved. */
export async function getEffectivePermissions(store: IdentityStore, roleId: string): Promise<Set<string>> {
  const permissions = await store.getPermissionsForRole(roleId);
  return new Set(permissions.map((p) => p.key));
}

export async function hasPermission(store: IdentityStore, membership: Membership, permissionKey: string): Promise<boolean> {
  const permissions = await getEffectivePermissions(store, membership.roleId);
  return permissions.has(permissionKey);
}

export interface AuthenticatedIdentity {
  user: User;
  session: Session;
}

/**
 * Verifies the `identity_session` cookie against the database (not just a
 * signature, unlike the stateless `founder_session`) and loads the user.
 * Writes a 401 and returns null if unauthenticated — callers return
 * immediately in that case, matching the existing `requireSession` guard's
 * contract in `server/routes/guard.ts`.
 */
export async function requireIdentityUser(
  ctx: { req: IncomingMessage; res: ServerResponse },
  deps: { sessions: SessionService; store: IdentityStore },
): Promise<AuthenticatedIdentity | null> {
  const cookies = parseCookies(ctx.req.headers.cookie);
  const token = cookies[IDENTITY_SESSION_COOKIE];
  const session = token ? await deps.sessions.verify(token) : null;
  if (!session) {
    sendJson(ctx.res, 401, { error: "Not authenticated." });
    return null;
  }
  const user = await deps.store.getUserById(session.userId);
  if (!user || user.disabledAt) {
    sendJson(ctx.res, 401, { error: "Not authenticated." });
    return null;
  }
  return { user, session };
}

/**
 * Resolves and verifies organization membership: `organizationId` (usually a
 * route param) if given, otherwise the session's current organization.
 * Writes 400 (no organization context) or 403 (not a member) and returns
 * null on failure.
 */
export async function requireOrganizationMembership(
  ctx: { req: IncomingMessage; res: ServerResponse },
  store: IdentityStore,
  identity: AuthenticatedIdentity,
  organizationId?: string,
): Promise<Membership | null> {
  const targetOrgId = organizationId ?? identity.session.organizationId ?? undefined;
  if (!targetOrgId) {
    sendJson(ctx.res, 400, { error: "No active organization. Switch to an organization first." });
    return null;
  }
  const membership = await store.getMembership(identity.user.id, targetOrgId);
  if (!membership || membership.status !== "active") {
    sendJson(ctx.res, 403, { error: "You are not an active member of this organization." });
    return null;
  }
  return membership;
}

/** Writes 403 and returns false if `membership`'s role lacks `permissionKey`; true (no response written) otherwise. */
export async function requirePermission(
  ctx: { req: IncomingMessage; res: ServerResponse },
  store: IdentityStore,
  membership: Membership,
  permissionKey: string,
): Promise<boolean> {
  const allowed = await hasPermission(store, membership, permissionKey);
  if (!allowed) {
    sendJson(ctx.res, 403, { error: `Missing required permission: "${permissionKey}".` });
    return false;
  }
  return true;
}

/**
 * The all-in-one RBAC guard most route handlers want: authenticate, resolve
 * organization membership, and check a permission, in one call. Returns null
 * (with the appropriate 401/400/403 already sent) at the first failing step.
 */
export async function requireOrgPermission(
  ctx: { req: IncomingMessage; res: ServerResponse },
  deps: { sessions: SessionService; store: IdentityStore },
  permissionKey: string,
  organizationId?: string,
): Promise<{ identity: AuthenticatedIdentity; membership: Membership } | null> {
  const identity = await requireIdentityUser(ctx, deps);
  if (!identity) return null;

  const membership = await requireOrganizationMembership(ctx, deps.store, identity, organizationId);
  if (!membership) return null;

  const allowed = await requirePermission(ctx, deps.store, membership, permissionKey);
  if (!allowed) return null;

  return { identity, membership };
}
