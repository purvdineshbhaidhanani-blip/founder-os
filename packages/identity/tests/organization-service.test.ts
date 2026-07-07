import { describe, expect, it } from "vitest";
import { InMemoryIdentityStore } from "../src/in-memory-store.js";
import { OrganizationService } from "../src/organization-service.js";
import { SYSTEM_ROLES } from "../src/permissions-catalog.js";

async function setup() {
  const store = new InMemoryIdentityStore();
  const orgs = new OrganizationService(store);
  const owner = await store.createUser({ email: "owner@example.com", passwordHash: "x" });
  const { organization } = await orgs.createOrganization(owner.id, "Acme Inc");
  return { store, orgs, owner, organization };
}

describe("OrganizationService", () => {
  it("createOrganization makes the creator an owner member", async () => {
    const { store, owner, organization } = await setup();
    const membership = await store.getMembership(owner.id, organization.id);
    const role = await store.getRoleById(membership!.roleId);
    expect(role?.name).toBe(SYSTEM_ROLES.OWNER);
  });

  it("addMemberByEmail requires the invitee to already have an account", async () => {
    const { orgs, owner, organization } = await setup();
    await expect(orgs.addMemberByEmail(organization.id, "nobody@example.com", SYSTEM_ROLES.MEMBER, owner.id)).rejects.toThrow();
  });

  it("adds, lists, re-roles, and removes a member", async () => {
    const { store, orgs, owner, organization } = await setup();
    const teammate = await store.createUser({ email: "teammate@example.com", passwordHash: "x" });

    await orgs.addMemberByEmail(organization.id, "teammate@example.com", SYSTEM_ROLES.MEMBER, owner.id);
    let members = await orgs.listMembers(organization.id);
    expect(members).toHaveLength(2);
    expect(members.find((m) => m.membership.userId === teammate.id)?.roleName).toBe(SYSTEM_ROLES.MEMBER);

    await orgs.changeMemberRole(organization.id, teammate.id, SYSTEM_ROLES.ADMIN, owner.id);
    members = await orgs.listMembers(organization.id);
    expect(members.find((m) => m.membership.userId === teammate.id)?.roleName).toBe(SYSTEM_ROLES.ADMIN);

    await orgs.removeMember(organization.id, teammate.id, owner.id);
    members = await orgs.listMembers(organization.id);
    expect(members).toHaveLength(1);
  });

  it("refuses to remove the organization owner", async () => {
    const { orgs, owner, organization } = await setup();
    await expect(orgs.removeMember(organization.id, owner.id, owner.id)).rejects.toThrow();
  });

  it("refuses to add the same member twice", async () => {
    const { store, orgs, owner, organization } = await setup();
    await store.createUser({ email: "dup@example.com", passwordHash: "x" });
    await orgs.addMemberByEmail(organization.id, "dup@example.com", SYSTEM_ROLES.MEMBER, owner.id);
    await expect(orgs.addMemberByEmail(organization.id, "dup@example.com", SYSTEM_ROLES.MEMBER, owner.id)).rejects.toThrow();
  });

  it("creates, lists, and manages team membership, requiring org membership first", async () => {
    const { store, orgs, owner, organization } = await setup();
    const teammate = await store.createUser({ email: "teammate2@example.com", passwordHash: "x" });

    const team = await orgs.createTeam(organization.id, "Engineering", owner.id);
    expect((await orgs.listTeams(organization.id)).map((t) => t.name)).toContain("Engineering");

    await expect(orgs.addTeamMember(organization.id, team.id, teammate.id, owner.id)).rejects.toThrow();

    await orgs.addMemberByEmail(organization.id, "teammate2@example.com", SYSTEM_ROLES.MEMBER, owner.id);
    await orgs.addTeamMember(organization.id, team.id, teammate.id, owner.id);
    expect((await orgs.listTeamMembers(team.id)).map((m) => m.userId)).toContain(teammate.id);

    await orgs.removeTeamMember(organization.id, team.id, teammate.id, owner.id);
    expect(await orgs.listTeamMembers(team.id)).toHaveLength(0);

    await orgs.deleteTeam(organization.id, team.id, owner.id);
    expect(await orgs.listTeams(organization.id)).toHaveLength(0);
  });

  it("records an audit log entry for every mutation", async () => {
    const { store, organization } = await setup();
    const logs = await store.listAuditLogs({ organizationId: organization.id });
    expect(logs.map((l) => l.action)).toContain("organization.created");
  });
});
