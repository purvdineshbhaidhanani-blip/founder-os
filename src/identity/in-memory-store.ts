import { randomUUID } from "node:crypto";
import { DEFAULT_SYSTEM_ROLE_PERMISSIONS, PERMISSION_DESCRIPTIONS, SYSTEM_ROLES } from "./permissions-catalog.js";
import type { IdentityStore } from "./store.js";
import type {
  AuditLogEntry,
  AuditLogFilter,
  Membership,
  MembershipStatus,
  NewAuditLogEntry,
  NewMembership,
  NewOrganization,
  NewRole,
  NewSession,
  NewTeam,
  NewUser,
  Organization,
  Permission,
  Profile,
  ProfilePatch,
  Role,
  Session,
  Team,
  TeamMember,
  User,
} from "./types.js";

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * In-process implementation of `IdentityStore` — the zero-config default for
 * tests and local development, and a drop-in replacement for
 * `PostgrestIdentityStore` behind the same interface. Pre-seeds the same
 * system roles/permissions the SQL migration seeds, so `getSystemRoleByName`
 * works immediately with no setup.
 */
export class InMemoryIdentityStore implements IdentityStore {
  private readonly users = new Map<string, User>();
  private readonly organizations = new Map<string, Organization>();
  private readonly teams = new Map<string, Team>();
  private readonly teamMembers: TeamMember[] = [];
  private readonly memberships = new Map<string, Membership>();
  private readonly roles = new Map<string, Role>();
  private readonly permissions = new Map<string, Permission>();
  private readonly rolePermissions = new Set<string>(); // `${roleId}:${permissionId}`
  private readonly profiles = new Map<string, Profile>();
  private readonly sessions = new Map<string, Session>();
  private readonly auditLogs: AuditLogEntry[] = [];

  constructor() {
    this.seedCatalog();
  }

  private seedCatalog(): void {
    const permissionIdByKey = new Map<string, string>();
    for (const [key, description] of Object.entries(PERMISSION_DESCRIPTIONS)) {
      const permission: Permission = { id: randomUUID(), key, description, createdAt: nowIso() };
      this.permissions.set(permission.id, permission);
      permissionIdByKey.set(key, permission.id);
    }

    for (const roleName of Object.values(SYSTEM_ROLES)) {
      const role: Role = { id: randomUUID(), organizationId: null, name: roleName, isSystem: true, createdAt: nowIso() };
      this.roles.set(role.id, role);
      for (const permissionKey of DEFAULT_SYSTEM_ROLE_PERMISSIONS[roleName]) {
        const permissionId = permissionIdByKey.get(permissionKey);
        if (permissionId) this.rolePermissions.add(`${role.id}:${permissionId}`);
      }
    }
  }

  private membershipKey(userId: string, organizationId: string): string {
    return `${userId}:${organizationId}`;
  }

  // ── users ────────────────────────────────────────────────────────────
  async createUser(user: NewUser): Promise<User> {
    const existing = await this.getUserByEmail(user.email);
    if (existing) throw new Error(`A user with email "${user.email}" already exists.`);
    const created: User = {
      id: randomUUID(),
      email: user.email,
      passwordHash: user.passwordHash,
      emailVerifiedAt: null,
      lastLoginAt: null,
      disabledAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.users.set(created.id, created);
    return created;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const lowered = email.toLowerCase();
    return [...this.users.values()].find((u) => u.email.toLowerCase() === lowered) ?? null;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async updateUser(id: string, patch: Partial<Pick<User, "passwordHash" | "lastLoginAt" | "disabledAt" | "emailVerifiedAt">>): Promise<void> {
    const user = this.users.get(id);
    if (!user) throw new Error(`Unknown user "${id}".`);
    Object.assign(user, patch, { updatedAt: nowIso() });
  }

  // ── organizations ───────────────────────────────────────────────────
  async createOrganization(org: NewOrganization): Promise<Organization> {
    const existing = await this.getOrganizationBySlug(org.slug);
    if (existing) throw new Error(`An organization with slug "${org.slug}" already exists.`);
    const created: Organization = {
      id: randomUUID(),
      name: org.name,
      slug: org.slug,
      ownerUserId: org.ownerUserId,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.organizations.set(created.id, created);
    return created;
  }

  async getOrganizationById(id: string): Promise<Organization | null> {
    return this.organizations.get(id) ?? null;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    const lowered = slug.toLowerCase();
    return [...this.organizations.values()].find((o) => o.slug.toLowerCase() === lowered) ?? null;
  }

  async listOrganizationsForUser(userId: string): Promise<Organization[]> {
    const orgIds = [...this.memberships.values()].filter((m) => m.userId === userId).map((m) => m.organizationId);
    return orgIds.map((id) => this.organizations.get(id)).filter((o): o is Organization => o !== undefined);
  }

  // ── teams ───────────────────────────────────────────────────────────
  async createTeam(team: NewTeam): Promise<Team> {
    const duplicate = [...this.teams.values()].find(
      (t) => t.organizationId === team.organizationId && t.name.toLowerCase() === team.name.toLowerCase(),
    );
    if (duplicate) throw new Error(`A team named "${team.name}" already exists in this organization.`);
    const created: Team = {
      id: randomUUID(),
      organizationId: team.organizationId,
      name: team.name,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.teams.set(created.id, created);
    return created;
  }

  async getTeamById(id: string): Promise<Team | null> {
    return this.teams.get(id) ?? null;
  }

  async listTeamsForOrganization(organizationId: string): Promise<Team[]> {
    return [...this.teams.values()].filter((t) => t.organizationId === organizationId);
  }

  async deleteTeam(id: string): Promise<void> {
    this.teams.delete(id);
    for (let i = this.teamMembers.length - 1; i >= 0; i--) {
      if (this.teamMembers[i]!.teamId === id) this.teamMembers.splice(i, 1);
    }
  }

  // ── team members ────────────────────────────────────────────────────
  async addTeamMember(teamId: string, userId: string): Promise<TeamMember> {
    const existing = this.teamMembers.find((m) => m.teamId === teamId && m.userId === userId);
    if (existing) return existing;
    const created: TeamMember = { teamId, userId, createdAt: nowIso() };
    this.teamMembers.push(created);
    return created;
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    const index = this.teamMembers.findIndex((m) => m.teamId === teamId && m.userId === userId);
    if (index >= 0) this.teamMembers.splice(index, 1);
  }

  async listTeamMembers(teamId: string): Promise<TeamMember[]> {
    return this.teamMembers.filter((m) => m.teamId === teamId);
  }

  async listTeamsForUser(organizationId: string, userId: string): Promise<Team[]> {
    const teamIds = new Set(this.teamMembers.filter((m) => m.userId === userId).map((m) => m.teamId));
    return [...this.teams.values()].filter((t) => t.organizationId === organizationId && teamIds.has(t.id));
  }

  // ── memberships ─────────────────────────────────────────────────────
  async createMembership(membership: NewMembership): Promise<Membership> {
    const key = this.membershipKey(membership.userId, membership.organizationId);
    if (this.memberships.has(key)) {
      throw new Error(`User "${membership.userId}" is already a member of organization "${membership.organizationId}".`);
    }
    const created: Membership = {
      id: randomUUID(),
      userId: membership.userId,
      organizationId: membership.organizationId,
      roleId: membership.roleId,
      status: membership.status ?? "active",
      invitedBy: membership.invitedBy ?? null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this.memberships.set(key, created);
    return created;
  }

  async getMembership(userId: string, organizationId: string): Promise<Membership | null> {
    return this.memberships.get(this.membershipKey(userId, organizationId)) ?? null;
  }

  async listMembershipsForOrganization(organizationId: string): Promise<Membership[]> {
    return [...this.memberships.values()].filter((m) => m.organizationId === organizationId);
  }

  async listMembershipsForUser(userId: string): Promise<Membership[]> {
    return [...this.memberships.values()].filter((m) => m.userId === userId);
  }

  async updateMembership(userId: string, organizationId: string, patch: { roleId?: string; status?: MembershipStatus }): Promise<void> {
    const membership = this.memberships.get(this.membershipKey(userId, organizationId));
    if (!membership) throw new Error(`No membership for user "${userId}" in organization "${organizationId}".`);
    Object.assign(membership, patch, { updatedAt: nowIso() });
  }

  async removeMembership(userId: string, organizationId: string): Promise<void> {
    this.memberships.delete(this.membershipKey(userId, organizationId));
  }

  // ── roles & permissions ─────────────────────────────────────────────
  async createRole(role: NewRole): Promise<Role> {
    const created: Role = {
      id: randomUUID(),
      organizationId: role.organizationId,
      name: role.name,
      isSystem: role.isSystem ?? false,
      createdAt: nowIso(),
    };
    this.roles.set(created.id, created);
    return created;
  }

  async getRoleById(id: string): Promise<Role | null> {
    return this.roles.get(id) ?? null;
  }

  async getSystemRoleByName(name: string): Promise<Role | null> {
    return [...this.roles.values()].find((r) => r.organizationId === null && r.name === name) ?? null;
  }

  async listRoles(organizationId: string | null): Promise<Role[]> {
    return [...this.roles.values()].filter((r) => r.organizationId === organizationId);
  }

  async listAllPermissions(): Promise<Permission[]> {
    return [...this.permissions.values()];
  }

  async getPermissionByKey(key: string): Promise<Permission | null> {
    return [...this.permissions.values()].find((p) => p.key === key) ?? null;
  }

  async getPermissionsForRole(roleId: string): Promise<Permission[]> {
    return [...this.permissions.values()].filter((p) => this.rolePermissions.has(`${roleId}:${p.id}`));
  }

  async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    this.rolePermissions.add(`${roleId}:${permissionId}`);
  }

  // ── profiles ────────────────────────────────────────────────────────
  async getProfile(userId: string): Promise<Profile | null> {
    return this.profiles.get(userId) ?? null;
  }

  async upsertProfile(userId: string, patch: ProfilePatch): Promise<Profile> {
    const existing = this.profiles.get(userId);
    const updated: Profile = {
      userId,
      displayName: patch.displayName ?? existing?.displayName ?? null,
      avatarUrl: patch.avatarUrl ?? existing?.avatarUrl ?? null,
      timezone: patch.timezone ?? existing?.timezone ?? null,
      locale: patch.locale ?? existing?.locale ?? null,
      bio: patch.bio ?? existing?.bio ?? null,
      createdAt: existing?.createdAt ?? nowIso(),
      updatedAt: nowIso(),
    };
    this.profiles.set(userId, updated);
    return updated;
  }

  // ── sessions ────────────────────────────────────────────────────────
  async createSession(session: NewSession): Promise<Session> {
    const created: Session = {
      id: randomUUID(),
      userId: session.userId,
      organizationId: session.organizationId,
      tokenHash: session.tokenHash,
      userAgent: session.userAgent ?? null,
      ipAddress: session.ipAddress ?? null,
      createdAt: nowIso(),
      lastSeenAt: nowIso(),
      expiresAt: session.expiresAt,
      revokedAt: null,
    };
    this.sessions.set(created.id, created);
    return created;
  }

  async getSessionByTokenHash(tokenHash: string): Promise<Session | null> {
    return [...this.sessions.values()].find((s) => s.tokenHash === tokenHash) ?? null;
  }

  async touchSession(id: string, patch: { lastSeenAt: string; organizationId?: string | null }): Promise<void> {
    const session = this.sessions.get(id);
    if (!session) return;
    session.lastSeenAt = patch.lastSeenAt;
    if (patch.organizationId !== undefined) session.organizationId = patch.organizationId;
  }

  async revokeSession(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (session) session.revokedAt = nowIso();
  }

  async revokeAllSessionsForUser(userId: string): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.revokedAt) session.revokedAt = nowIso();
    }
  }

  // ── audit log ───────────────────────────────────────────────────────
  async recordAuditLog(entry: NewAuditLogEntry): Promise<AuditLogEntry> {
    const created: AuditLogEntry = {
      id: randomUUID(),
      organizationId: entry.organizationId,
      actorUserId: entry.actorUserId,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      metadata: entry.metadata ?? {},
      createdAt: nowIso(),
    };
    this.auditLogs.push(created);
    return created;
  }

  async listAuditLogs(filter: AuditLogFilter): Promise<AuditLogEntry[]> {
    let results = [...this.auditLogs];
    if (filter.organizationId) results = results.filter((e) => e.organizationId === filter.organizationId);
    if (filter.actorUserId) results = results.filter((e) => e.actorUserId === filter.actorUserId);
    if (filter.action) results = results.filter((e) => e.action === filter.action);
    if (filter.since) results = results.filter((e) => e.createdAt >= filter.since!);
    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return filter.limit ? results.slice(0, filter.limit) : results;
  }
}
