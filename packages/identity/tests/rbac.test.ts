import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it } from "vitest";
import { AuthService } from "../src/auth-service.js";
import { InMemoryIdentityStore } from "../src/in-memory-store.js";
import { PERMISSIONS, SYSTEM_ROLES } from "../src/permissions-catalog.js";
import { hasPermission, requireIdentityUser, requireOrgPermission, requireOrganizationMembership } from "../src/rbac.js";
import { IDENTITY_SESSION_COOKIE, SessionService } from "../src/session-service.js";

function fakeReq(cookie?: string): IncomingMessage {
  return { headers: { cookie } } as unknown as IncomingMessage;
}

function fakeRes(): ServerResponse & { statusCode?: number; jsonBody?: unknown } {
  const res = {} as ServerResponse & { statusCode?: number; jsonBody?: unknown };
  res.writeHead = ((status: number) => {
    res.statusCode = status;
    return res;
  }) as ServerResponse["writeHead"];
  res.end = ((body?: unknown) => {
    if (typeof body === "string" && body.length > 0) res.jsonBody = JSON.parse(body);
  }) as ServerResponse["end"];
  return res;
}

async function setup() {
  const store = new InMemoryIdentityStore();
  const sessions = new SessionService(store);
  const auth = new AuthService(store, sessions);
  return { store, sessions, auth };
}

describe("RBAC guards", () => {
  it("requireIdentityUser rejects a missing cookie with 401", async () => {
    const { store, sessions } = await setup();
    const res = fakeRes();
    const result = await requireIdentityUser({ req: fakeReq(undefined), res }, { sessions, store });
    expect(result).toBeNull();
    expect(res.statusCode).toBe(401);
  });

  it("requireIdentityUser rejects a bogus cookie with 401", async () => {
    const { store, sessions } = await setup();
    const res = fakeRes();
    const result = await requireIdentityUser({ req: fakeReq(`${IDENTITY_SESSION_COOKIE}=garbage`), res }, { sessions, store });
    expect(result).toBeNull();
    expect(res.statusCode).toBe(401);
  });

  it("requireIdentityUser succeeds with a valid session cookie", async () => {
    const { store, sessions, auth } = await setup();
    const registered = await auth.register({ email: "u@example.com", password: "correct-horse-battery" });
    const res = fakeRes();
    const result = await requireIdentityUser(
      { req: fakeReq(`${IDENTITY_SESSION_COOKIE}=${encodeURIComponent(registered.issuedSession.token)}`), res },
      { sessions, store },
    );
    expect(result?.user.email).toBe("u@example.com");
    expect(res.statusCode).toBeUndefined();
  });

  it("requireOrganizationMembership returns 400 when there's no organization context", async () => {
    const { store, auth } = await setup();
    const registered = await auth.register({ email: "noorg@example.com", password: "correct-horse-battery" });
    const res = fakeRes();
    const result = await requireOrganizationMembership({ req: fakeReq(), res }, store, {
      user: registered.user,
      session: registered.issuedSession.session,
    });
    expect(result).toBeNull();
    expect(res.statusCode).toBe(400);
  });

  it("requireOrganizationMembership returns 403 for a non-member", async () => {
    const { store, auth } = await setup();
    const a = await auth.register({ email: "a2@example.com", password: "correct-horse-battery", organizationName: "Org A" });
    const b = await auth.register({ email: "b2@example.com", password: "correct-horse-battery", organizationName: "Org B" });
    const res = fakeRes();
    const result = await requireOrganizationMembership(
      { req: fakeReq(), res },
      store,
      { user: a.user, session: a.issuedSession.session },
      b.organization!.id,
    );
    expect(result).toBeNull();
    expect(res.statusCode).toBe(403);
  });

  it("hasPermission distinguishes owner from member", async () => {
    const { store, auth } = await setup();
    const owner = await auth.register({ email: "owner2@example.com", password: "correct-horse-battery", organizationName: "Org" });
    const ownerMembership = await store.getMembership(owner.user.id, owner.organization!.id);
    expect(await hasPermission(store, ownerMembership!, PERMISSIONS.MEMBERS_INVITE)).toBe(true);

    const memberRole = await store.getSystemRoleByName(SYSTEM_ROLES.MEMBER);
    const plainMembership = { ...ownerMembership!, roleId: memberRole!.id };
    expect(await hasPermission(store, plainMembership, PERMISSIONS.MEMBERS_INVITE)).toBe(false);
  });

  it("requireOrgPermission chains auth + membership + permission and returns 403 for an under-privileged member", async () => {
    const { store, sessions, auth } = await setup();
    const owner = await auth.register({ email: "owner3@example.com", password: "correct-horse-battery", organizationName: "Org" });
    const memberUser = await store.createUser({ email: "member3@example.com", passwordHash: "x" });
    const memberRole = await store.getSystemRoleByName(SYSTEM_ROLES.MEMBER);
    await store.createMembership({ userId: memberUser.id, organizationId: owner.organization!.id, roleId: memberRole!.id });
    const memberSession = await sessions.create({ userId: memberUser.id, organizationId: owner.organization!.id });

    const res = fakeRes();
    const result = await requireOrgPermission(
      { req: fakeReq(`${IDENTITY_SESSION_COOKIE}=${encodeURIComponent(memberSession.token)}`), res },
      { sessions, store },
      PERMISSIONS.MEMBERS_INVITE,
      owner.organization!.id,
    );
    expect(result).toBeNull();
    expect(res.statusCode).toBe(403);
  });

  it("requireOrgPermission succeeds for the owner", async () => {
    const { store, sessions, auth } = await setup();
    const owner = await auth.register({ email: "owner4@example.com", password: "correct-horse-battery", organizationName: "Org" });
    const res = fakeRes();
    const result = await requireOrgPermission(
      { req: fakeReq(`${IDENTITY_SESSION_COOKIE}=${encodeURIComponent(owner.issuedSession.token)}`), res },
      { sessions, store },
      PERMISSIONS.MEMBERS_INVITE,
      owner.organization!.id,
    );
    expect(result?.identity.user.email).toBe("owner4@example.com");
    expect(res.statusCode).toBeUndefined();
  });
});
