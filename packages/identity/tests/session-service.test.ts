import { describe, expect, it } from "vitest";
import { InMemoryIdentityStore } from "../src/in-memory-store.js";
import { SessionService } from "../src/session-service.js";

describe("SessionService", () => {
  it("verifies a freshly issued session and rejects a bogus token", async () => {
    const store = new InMemoryIdentityStore();
    const sessions = new SessionService(store);
    const issued = await sessions.create({ userId: "u1", organizationId: null });
    expect(await sessions.verify(issued.token)).not.toBeNull();
    expect(await sessions.verify("not-a-real-token")).toBeNull();
  });

  it("never persists the raw token — only its hash is stored", async () => {
    const store = new InMemoryIdentityStore();
    const sessions = new SessionService(store);
    const issued = await sessions.create({ userId: "u1", organizationId: null });
    expect(issued.session.tokenHash).not.toBe(issued.token);
    expect(issued.session.tokenHash).toHaveLength(64); // sha256 hex
  });

  it("rejects an expired session", async () => {
    const store = new InMemoryIdentityStore();
    const sessions = new SessionService(store, -1000); // already expired
    const issued = await sessions.create({ userId: "u1", organizationId: null });
    expect(await sessions.verify(issued.token)).toBeNull();
  });

  it("revoke() invalidates the session immediately", async () => {
    const store = new InMemoryIdentityStore();
    const sessions = new SessionService(store);
    const issued = await sessions.create({ userId: "u1", organizationId: null });
    await sessions.revoke(issued.session.id);
    expect(await sessions.verify(issued.token)).toBeNull();
  });

  it("revokeAllForUser() invalidates every session for that user, not others'", async () => {
    const store = new InMemoryIdentityStore();
    const sessions = new SessionService(store);
    const a1 = await sessions.create({ userId: "u1", organizationId: null });
    const a2 = await sessions.create({ userId: "u1", organizationId: null });
    const b1 = await sessions.create({ userId: "u2", organizationId: null });

    await sessions.revokeAllForUser("u1");

    expect(await sessions.verify(a1.token)).toBeNull();
    expect(await sessions.verify(a2.token)).toBeNull();
    expect(await sessions.verify(b1.token)).not.toBeNull();
  });

  it("switchOrganization updates the session's active organization", async () => {
    const store = new InMemoryIdentityStore();
    const sessions = new SessionService(store);
    const issued = await sessions.create({ userId: "u1", organizationId: null });
    await sessions.switchOrganization(issued.session.id, "org-2");
    const verified = await sessions.verify(issued.token);
    expect(verified?.organizationId).toBe("org-2");
  });
});
