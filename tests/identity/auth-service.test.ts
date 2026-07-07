import { describe, expect, it } from "vitest";
import { AuthService } from "../../src/identity/auth-service.js";
import { InMemoryIdentityStore } from "../../src/identity/in-memory-store.js";
import { SessionService } from "../../src/identity/session-service.js";

function makeAuth() {
  const store = new InMemoryIdentityStore();
  const sessions = new SessionService(store);
  return { store, sessions, auth: new AuthService(store, sessions) };
}

describe("AuthService", () => {
  it("registers a user, optionally creating an organization and issuing a session", async () => {
    const { auth } = makeAuth();
    const result = await auth.register({ email: "founder@acme.com", password: "correct-horse-battery", organizationName: "Acme Inc" });
    expect(result.user.email).toBe("founder@acme.com");
    expect(result.organization?.name).toBe("Acme Inc");
    expect(result.issuedSession.session.organizationId).toBe(result.organization!.id);
    expect(result.issuedSession.token).toBeTruthy();
  });

  it("rejects registration with too short a password", async () => {
    const { auth } = makeAuth();
    await expect(auth.register({ email: "a@example.com", password: "short" })).rejects.toThrow();
  });

  it("rejects registering an email that already exists", async () => {
    const { auth } = makeAuth();
    await auth.register({ email: "dup@example.com", password: "correct-horse-battery" });
    await expect(auth.register({ email: "dup@example.com", password: "another-password" })).rejects.toThrow();
  });

  it("logs in with correct credentials and rejects incorrect ones", async () => {
    const { auth } = makeAuth();
    await auth.register({ email: "user@example.com", password: "correct-horse-battery" });

    const result = await auth.login({ email: "user@example.com", password: "correct-horse-battery" });
    expect(result.user.email).toBe("user@example.com");

    await expect(auth.login({ email: "user@example.com", password: "wrong-password" })).rejects.toThrow();
    await expect(auth.login({ email: "nobody@example.com", password: "whatever1" })).rejects.toThrow();
  });

  it("a single-org user's session lands directly in that organization on login", async () => {
    const { auth } = makeAuth();
    const registered = await auth.register({ email: "solo@example.com", password: "correct-horse-battery", organizationName: "Solo Org" });
    const loggedIn = await auth.login({ email: "solo@example.com", password: "correct-horse-battery" });
    expect(loggedIn.issuedSession.session.organizationId).toBe(registered.organization!.id);
  });

  it("a zero-org user's session has no active organization", async () => {
    const { auth } = makeAuth();
    await auth.register({ email: "noorg@example.com", password: "correct-horse-battery" });
    const loggedIn = await auth.login({ email: "noorg@example.com", password: "correct-horse-battery" });
    expect(loggedIn.issuedSession.session.organizationId).toBeNull();
  });

  it("switchOrganization refuses to switch into an organization the user does not belong to", async () => {
    const { auth } = makeAuth();
    const a = await auth.register({ email: "a@example.com", password: "correct-horse-battery", organizationName: "Org A" });
    const b = await auth.register({ email: "b@example.com", password: "correct-horse-battery", organizationName: "Org B" });
    await expect(auth.switchOrganization(a.issuedSession.session.id, a.user.id, b.organization!.id)).rejects.toThrow();
  });

  it("logout revokes the session so it no longer verifies", async () => {
    const { auth, sessions } = makeAuth();
    const result = await auth.register({ email: "logout@example.com", password: "correct-horse-battery" });
    expect(await sessions.verify(result.issuedSession.token)).not.toBeNull();
    await auth.logout(result.issuedSession.session.id, result.user.id);
    expect(await sessions.verify(result.issuedSession.token)).toBeNull();
  });
});
