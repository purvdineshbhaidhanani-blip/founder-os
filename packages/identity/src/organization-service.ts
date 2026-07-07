import { generateUniqueOrganizationSlug } from "./slug.js";
import type { IdentityStore } from "./store.js";
import type { Membership, Organization, Team, TeamMember } from "./types.js";

export interface MemberView {
  membership: Membership;
  roleName: string;
}

/**
 * Organization, team, and membership lifecycle: creating an org (and its
 * owner membership), adding/removing/re-roling members, and team CRUD +
 * membership. Every mutating action is recorded to the audit log — this
 * service is the only place org/team state changes, so it's the only place
 * that needs to remember to log it.
 */
export class OrganizationService {
  constructor(private readonly store: IdentityStore) {}

  async createOrganization(ownerUserId: string, name: string): Promise<{ organization: Organization; membership: Membership }> {
    const slug = await generateUniqueOrganizationSlug(this.store, name);
    const organization = await this.store.createOrganization({ name, slug, ownerUserId });
    const ownerRole = await this.store.getSystemRoleByName("owner");
    if (!ownerRole) throw new Error('System role "owner" is not seeded. Apply supabase/migrations/0002_identity.sql.');

    const membership = await this.store.createMembership({
      userId: ownerUserId,
      organizationId: organization.id,
      roleId: ownerRole.id,
      status: "active",
    });

    await this.store.recordAuditLog({
      organizationId: organization.id,
      actorUserId: ownerUserId,
      action: "organization.created",
      targetType: "organization",
      targetId: organization.id,
      metadata: { name, slug },
    });

    return { organization, membership };
  }

  async addMemberByEmail(organizationId: string, email: string, roleName: string, invitedBy: string): Promise<Membership> {
    const user = await this.store.getUserByEmail(email);
    if (!user) {
      throw new Error(`No user is registered with email "${email}". They must register an account before being added to an organization.`);
    }
    const existing = await this.store.getMembership(user.id, organizationId);
    if (existing) throw new Error(`"${email}" is already a member of this organization.`);

    const role = await this.resolveRole(organizationId, roleName);
    const membership = await this.store.createMembership({
      userId: user.id,
      organizationId,
      roleId: role.id,
      status: "active",
      invitedBy,
    });

    await this.store.recordAuditLog({
      organizationId,
      actorUserId: invitedBy,
      action: "member.added",
      targetType: "user",
      targetId: user.id,
      metadata: { email, role: roleName },
    });

    return membership;
  }

  async removeMember(organizationId: string, targetUserId: string, actorUserId: string): Promise<void> {
    const organization = await this.store.getOrganizationById(organizationId);
    if (organization?.ownerUserId === targetUserId) {
      throw new Error("The organization owner cannot be removed. Transfer ownership first.");
    }
    await this.store.removeMembership(targetUserId, organizationId);
    await this.store.recordAuditLog({
      organizationId,
      actorUserId,
      action: "member.removed",
      targetType: "user",
      targetId: targetUserId,
    });
  }

  async changeMemberRole(organizationId: string, targetUserId: string, roleName: string, actorUserId: string): Promise<void> {
    const role = await this.resolveRole(organizationId, roleName);
    await this.store.updateMembership(targetUserId, organizationId, { roleId: role.id });
    await this.store.recordAuditLog({
      organizationId,
      actorUserId,
      action: "member.role.changed",
      targetType: "user",
      targetId: targetUserId,
      metadata: { role: roleName },
    });
  }

  async listMembers(organizationId: string): Promise<MemberView[]> {
    const memberships = await this.store.listMembershipsForOrganization(organizationId);
    const views: MemberView[] = [];
    for (const membership of memberships) {
      const role = await this.store.getRoleById(membership.roleId);
      views.push({ membership, roleName: role?.name ?? "unknown" });
    }
    return views;
  }

  private async resolveRole(organizationId: string, roleName: string) {
    const systemRole = await this.store.getSystemRoleByName(roleName);
    if (systemRole) return systemRole;
    const orgRoles = await this.store.listRoles(organizationId);
    const customRole = orgRoles.find((r) => r.name === roleName);
    if (customRole) return customRole;
    throw new Error(`Unknown role "${roleName}" for this organization.`);
  }

  // ── teams ───────────────────────────────────────────────────────────
  async createTeam(organizationId: string, name: string, actorUserId: string): Promise<Team> {
    const team = await this.store.createTeam({ organizationId, name });
    await this.store.recordAuditLog({
      organizationId,
      actorUserId,
      action: "team.created",
      targetType: "team",
      targetId: team.id,
      metadata: { name },
    });
    return team;
  }

  async deleteTeam(organizationId: string, teamId: string, actorUserId: string): Promise<void> {
    await this.store.deleteTeam(teamId);
    await this.store.recordAuditLog({
      organizationId,
      actorUserId,
      action: "team.deleted",
      targetType: "team",
      targetId: teamId,
    });
  }

  async listTeams(organizationId: string): Promise<Team[]> {
    return this.store.listTeamsForOrganization(organizationId);
  }

  async addTeamMember(organizationId: string, teamId: string, targetUserId: string, actorUserId: string): Promise<TeamMember> {
    const membership = await this.store.getMembership(targetUserId, organizationId);
    if (!membership) throw new Error("A user must be a member of the organization before joining one of its teams.");

    const member = await this.store.addTeamMember(teamId, targetUserId);
    await this.store.recordAuditLog({
      organizationId,
      actorUserId,
      action: "team.member.added",
      targetType: "team",
      targetId: teamId,
      metadata: { userId: targetUserId },
    });
    return member;
  }

  async removeTeamMember(organizationId: string, teamId: string, targetUserId: string, actorUserId: string): Promise<void> {
    await this.store.removeTeamMember(teamId, targetUserId);
    await this.store.recordAuditLog({
      organizationId,
      actorUserId,
      action: "team.member.removed",
      targetType: "team",
      targetId: teamId,
      metadata: { userId: targetUserId },
    });
  }

  async listTeamMembers(teamId: string): Promise<TeamMember[]> {
    return this.store.listTeamMembers(teamId);
  }
}
