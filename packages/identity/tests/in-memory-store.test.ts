import { describe, expect, it } from "vitest";
import { InMemoryIdentityStore } from "../src/in-memory-store.js";
import { PERMISSIONS, SYSTEM_ROLES } from "../src/permissions-catalog.js";

describe("InMemoryIdentityStore", () => {
  it("pre-seeds the system roles and permission catalog", async () => {
    const store = new InMemoryIdentityStore();
    const owner = await store.getSystemRoleByName(SYSTEM_ROLES.OWNER);
    const admin = await store.getSystemRoleByName(SYSTEM_ROLES.ADMIN);
    const member = await store.getSystemRoleByName(SYSTEM_ROLES.MEMBER);
    expect(owner).not.toBeNull();
    expect(admin).not.toBeNull();
    expect(member).not.toBeNull();

    const ownerPermissions = await store.getPermissionsForRole(owner!.id);
    expect(ownerPermissions.map((p) => p.key).sort()).toEqual(Object.values(PERMISSIONS).sort());

    const adminPermissions = await store.getPermissionsForRole(admin!.id);
    expect(adminPermissions.map((p) => p.key)).not.toContain(PERMISSIONS.ORGANIZATION_DELETE);

    const memberPermissions = await store.getPermissionsForRole(member!.id);
    expect(memberPermissions).toHaveLength(0);
  });

  it("enforces unique email on user creation", async () => {
    const store = new InMemoryIdentityStore();
    await store.createUser({ email: "a@example.com", passwordHash: "x" });
    await expect(store.createUser({ email: "a@example.com", passwordHash: "y" })).rejects.toThrow();
  });

  it("looks up users case-insensitively by email", async () => {
    const store = new InMemoryIdentityStore();
    await store.createUser({ email: "Ada@Example.com", passwordHash: "x" });
    expect(await store.getUserByEmail("ada@example.com")).not.toBeNull();
  });

  it("enforces unique organization slug", async () => {
    const store = new InMemoryIdentityStore();
    const owner = await store.createUser({ email: "owner@example.com", passwordHash: "x" });
    await store.createOrganization({ name: "Acme", slug: "acme", ownerUserId: owner.id });
    await expect(store.createOrganization({ name: "Acme 2", slug: "acme", ownerUserId: owner.id })).rejects.toThrow();
  });

  it("enforces one membership per user per organization", async () => {
    const store = new InMemoryIdentityStore();
    const user = await store.createUser({ email: "u@example.com", passwordHash: "x" });
    const org = await store.createOrganization({ name: "Acme", slug: "acme", ownerUserId: user.id });
    const role = await store.getSystemRoleByName(SYSTEM_ROLES.MEMBER);
    await store.createMembership({ userId: user.id, organizationId: org.id, roleId: role!.id });
    await expect(store.createMembership({ userId: user.id, organizationId: org.id, roleId: role!.id })).rejects.toThrow();
  });

  it("audit log filters by organization and sorts newest first", async () => {
    const store = new InMemoryIdentityStore();
    await store.recordAuditLog({ organizationId: "org-1", actorUserId: null, action: "a" });
    await new Promise((r) => setTimeout(r, 2));
    await store.recordAuditLog({ organizationId: "org-1", actorUserId: null, action: "b" });
    await store.recordAuditLog({ organizationId: "org-2", actorUserId: null, action: "c" });

    const org1Logs = await store.listAuditLogs({ organizationId: "org-1" });
    expect(org1Logs.map((e) => e.action)).toEqual(["b", "a"]);
  });
});
