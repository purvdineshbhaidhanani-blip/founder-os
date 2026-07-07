import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "../../src/server/index.js";
import { composeAppContext } from "../../src/server/wiring.js";

let server: Server;
let baseUrl: string;

function extractCookie(setCookieHeader: string | null): string {
  expect(setCookieHeader).toBeTruthy();
  return setCookieHeader!.split(";")[0]!;
}

beforeAll(async () => {
  process.env.SESSION_SECRET = "test-secret-for-identity-suite";
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  const ctx = composeAppContext();
  server = createServer(ctx);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

async function registerAndLogin(email: string, orgName?: string) {
  const res = await fetch(`${baseUrl}/api/identity/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "correct-horse-battery", organizationName: orgName }),
  });
  const cookie = extractCookie(res.headers.get("set-cookie"));
  const body = await res.json();
  return { cookie, body, status: res.status };
}

describe("identity routes", () => {
  it("registers a new account, creating an organization and setting a session cookie", async () => {
    const { status, body, cookie } = await registerAndLogin("founder@acme.com", "Acme Inc");
    expect(status).toBe(201);
    expect(body.user.email).toBe("founder@acme.com");
    expect(body.organization.name).toBe("Acme Inc");
    expect(cookie).toContain("identity_session=");
  });

  it("rejects registering a duplicate email", async () => {
    await registerAndLogin("dup@acme.com");
    const res = await fetch(`${baseUrl}/api/identity/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "dup@acme.com", password: "correct-horse-battery" }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects login with the wrong password without leaking whether the account exists", async () => {
    await registerAndLogin("victim@acme.com");
    const res = await fetch(`${baseUrl}/api/identity/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "victim@acme.com", password: "wrong-password" }),
    });
    expect(res.status).toBe(401);
    const nonexistent = await fetch(`${baseUrl}/api/identity/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nobody@acme.com", password: "wrong-password" }),
    });
    expect(nonexistent.status).toBe(401);
    expect((await nonexistent.json()).error).toBe((await res.json()).error);
  });

  it("GET /api/identity/me requires authentication and reflects the active organization", async () => {
    const unauth = await fetch(`${baseUrl}/api/identity/me`);
    expect(unauth.status).toBe(401);

    const { cookie, body } = await registerAndLogin("me@acme.com", "Me Co");
    const res = await fetch(`${baseUrl}/api/identity/me`, { headers: { Cookie: cookie } });
    expect(res.status).toBe(200);
    const me = await res.json();
    expect(me.user.email).toBe("me@acme.com");
    expect(me.activeOrganizationId).toBe(body.organization.id);
  });

  it("logout revokes the session so subsequent requests are unauthenticated", async () => {
    const { cookie } = await registerAndLogin("logout@acme.com");
    await fetch(`${baseUrl}/api/identity/logout`, { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" }, body: "{}" });
    const res = await fetch(`${baseUrl}/api/identity/me`, { headers: { Cookie: cookie } });
    expect(res.status).toBe(401);
  });

  it("a non-owner member cannot invite members (RBAC enforcement), the owner can", async () => {
    const owner = await registerAndLogin("owner@rbac.com", "RBAC Co");
    const orgId = owner.body.organization.id;

    // Register a second, org-less user, then add them as a plain "member".
    const memberAccount = await registerAndLogin("member@rbac.com");
    const addRes = await fetch(`${baseUrl}/api/identity/organizations/${orgId}/members`, {
      method: "POST",
      headers: { Cookie: owner.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "member@rbac.com", role: "member" }),
    });
    expect(addRes.status).toBe(201);

    // The member switches into the org, then tries (and fails) to invite someone else.
    await fetch(`${baseUrl}/api/identity/organizations/${orgId}/switch`, { method: "POST", headers: { Cookie: memberAccount.cookie, "Content-Type": "application/json" }, body: "{}" });
    const forbidden = await fetch(`${baseUrl}/api/identity/organizations/${orgId}/members`, {
      method: "POST",
      headers: { Cookie: memberAccount.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "someone-else@rbac.com", role: "member" }),
    });
    expect(forbidden.status).toBe(403);

    // The owner, meanwhile, can invite fine.
    await registerAndLogin("someone-else@rbac.com");
    const allowed = await fetch(`${baseUrl}/api/identity/organizations/${orgId}/members`, {
      method: "POST",
      headers: { Cookie: owner.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "someone-else@rbac.com", role: "member" }),
    });
    expect(allowed.status).toBe(201);
  });

  it("organization switching moves the session's active organization and is member-gated", async () => {
    const a = await registerAndLogin("switcher@a.com", "Org A");
    const b = await registerAndLogin("other@b.com", "Org B");

    const denied = await fetch(`${baseUrl}/api/identity/organizations/${b.body.organization.id}/switch`, {
      method: "POST",
      headers: { Cookie: a.cookie, "Content-Type": "application/json" },
      body: "{}",
    });
    expect(denied.status).toBe(403);

    const allowed = await fetch(`${baseUrl}/api/identity/organizations/${a.body.organization.id}/switch`, {
      method: "POST",
      headers: { Cookie: a.cookie, "Content-Type": "application/json" },
      body: "{}",
    });
    expect(allowed.status).toBe(200);
  });

  it("creates a team, adds a team member, and lists team members", async () => {
    const owner = await registerAndLogin("teamowner@acme.com", "Team Org");
    const orgId = owner.body.organization.id;

    const teamRes = await fetch(`${baseUrl}/api/identity/organizations/${orgId}/teams`, {
      method: "POST",
      headers: { Cookie: owner.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Engineering" }),
    });
    expect(teamRes.status).toBe(201);
    const team = await teamRes.json();

    const meRes = await fetch(`${baseUrl}/api/identity/me`, { headers: { Cookie: owner.cookie } });
    const me = await meRes.json();

    const addMemberRes = await fetch(`${baseUrl}/api/identity/organizations/${orgId}/teams/${team.id}/members`, {
      method: "POST",
      headers: { Cookie: owner.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ userId: me.user.id }),
    });
    expect(addMemberRes.status).toBe(201);

    const listRes = await fetch(`${baseUrl}/api/identity/organizations/${orgId}/teams/${team.id}/members`, { headers: { Cookie: owner.cookie } });
    const members = await listRes.json();
    expect(members.map((m: { userId: string }) => m.userId)).toContain(me.user.id);
  });

  it("audit log is database-backed, permission-gated, and reflects prior actions", async () => {
    const owner = await registerAndLogin("audit@acme.com", "Audit Org");
    const orgId = owner.body.organization.id;

    const auditRes = await fetch(`${baseUrl}/api/identity/organizations/${orgId}/audit-logs`, { headers: { Cookie: owner.cookie } });
    expect(auditRes.status).toBe(200);
    const entries = await auditRes.json();
    expect(entries.some((e: { action: string }) => e.action === "organization.created")).toBe(true);

    const member = await registerAndLogin("auditmember@acme.com");
    await fetch(`${baseUrl}/api/identity/organizations/${orgId}/members`, {
      method: "POST",
      headers: { Cookie: owner.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ email: "auditmember@acme.com", role: "member" }),
    });
    await fetch(`${baseUrl}/api/identity/organizations/${orgId}/switch`, { method: "POST", headers: { Cookie: member.cookie, "Content-Type": "application/json" }, body: "{}" });

    const denied = await fetch(`${baseUrl}/api/identity/organizations/${orgId}/audit-logs`, { headers: { Cookie: member.cookie } });
    expect(denied.status).toBe(403);
  });

  it("profile can be read and updated by the owning user", async () => {
    const { cookie } = await registerAndLogin("profile@acme.com");
    const empty = await fetch(`${baseUrl}/api/identity/profile`, { headers: { Cookie: cookie } });
    expect((await empty.json()).displayName).toBeNull();

    const update = await fetch(`${baseUrl}/api/identity/profile`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "Ada Lovelace" }),
    });
    expect((await update.json()).displayName).toBe("Ada Lovelace");
  });
});
