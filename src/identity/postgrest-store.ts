import { eq, PostgrestClient, type PostgrestConfig } from "./postgrest-client.js";
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

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  email_verified_at: string | null;
  last_login_at: string | null;
  disabled_at: string | null;
  created_at: string;
  updated_at: string;
}
const userFromRow = (r: UserRow): User => ({
  id: r.id,
  email: r.email,
  passwordHash: r.password_hash,
  emailVerifiedAt: r.email_verified_at,
  lastLoginAt: r.last_login_at,
  disabledAt: r.disabled_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  created_at: string;
  updated_at: string;
}
const orgFromRow = (r: OrganizationRow): Organization => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  ownerUserId: r.owner_user_id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

interface TeamRow {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}
const teamFromRow = (r: TeamRow): Team => ({
  id: r.id,
  organizationId: r.organization_id,
  name: r.name,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

interface TeamMemberRow {
  team_id: string;
  user_id: string;
  created_at: string;
}
const teamMemberFromRow = (r: TeamMemberRow): TeamMember => ({ teamId: r.team_id, userId: r.user_id, createdAt: r.created_at });

interface MembershipRow {
  id: string;
  user_id: string;
  organization_id: string;
  role_id: string;
  status: MembershipStatus;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}
const membershipFromRow = (r: MembershipRow): Membership => ({
  id: r.id,
  userId: r.user_id,
  organizationId: r.organization_id,
  roleId: r.role_id,
  status: r.status,
  invitedBy: r.invited_by,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

interface RoleRow {
  id: string;
  organization_id: string | null;
  name: string;
  is_system: boolean;
  created_at: string;
}
const roleFromRow = (r: RoleRow): Role => ({
  id: r.id,
  organizationId: r.organization_id,
  name: r.name,
  isSystem: r.is_system,
  createdAt: r.created_at,
});

interface PermissionRow {
  id: string;
  key: string;
  description: string;
  created_at: string;
}
const permissionFromRow = (r: PermissionRow): Permission => ({ id: r.id, key: r.key, description: r.description, createdAt: r.created_at });

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string | null;
  locale: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}
const profileFromRow = (r: ProfileRow): Profile => ({
  userId: r.user_id,
  displayName: r.display_name,
  avatarUrl: r.avatar_url,
  timezone: r.timezone,
  locale: r.locale,
  bio: r.bio,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

interface SessionRow {
  id: string;
  user_id: string;
  organization_id: string | null;
  token_hash: string;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  revoked_at: string | null;
}
const sessionFromRow = (r: SessionRow): Session => ({
  id: r.id,
  userId: r.user_id,
  organizationId: r.organization_id,
  tokenHash: r.token_hash,
  userAgent: r.user_agent,
  ipAddress: r.ip_address,
  createdAt: r.created_at,
  lastSeenAt: r.last_seen_at,
  expiresAt: r.expires_at,
  revokedAt: r.revoked_at,
});

interface AuditLogRow {
  id: string;
  organization_id: string | null;
  actor_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
const auditFromRow = (r: AuditLogRow): AuditLogEntry => ({
  id: r.id,
  organizationId: r.organization_id,
  actorUserId: r.actor_user_id,
  action: r.action,
  targetType: r.target_type,
  targetId: r.target_id,
  metadata: r.metadata,
  createdAt: r.created_at,
});

/**
 * Production `IdentityStore`: talks to Postgres through Supabase's PostgREST
 * endpoint using the service_role key. Table shapes come from
 * `supabase/migrations/0002_identity.sql`. Every method here is a thin
 * camelCase <-> snake_case translation over `PostgrestClient` — no business
 * logic lives in this file (that's `auth-service.ts`/`rbac.ts`).
 */
export class PostgrestIdentityStore implements IdentityStore {
  private readonly client: PostgrestClient;

  constructor(config: PostgrestConfig) {
    this.client = new PostgrestClient(config);
  }

  // ── users ────────────────────────────────────────────────────────────
  async createUser(user: NewUser): Promise<User> {
    const row = await this.client.insert<UserRow>("users", { email: user.email, password_hash: user.passwordHash });
    return userFromRow(row);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const row = await this.client.selectOne<UserRow>("users", { filters: { email: eq(email) } });
    return row ? userFromRow(row) : null;
  }

  async getUserById(id: string): Promise<User | null> {
    const row = await this.client.selectOne<UserRow>("users", { filters: { id: eq(id) } });
    return row ? userFromRow(row) : null;
  }

  async updateUser(id: string, patch: Partial<Pick<User, "passwordHash" | "lastLoginAt" | "disabledAt" | "emailVerifiedAt">>): Promise<void> {
    const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.passwordHash !== undefined) body.password_hash = patch.passwordHash;
    if (patch.lastLoginAt !== undefined) body.last_login_at = patch.lastLoginAt;
    if (patch.disabledAt !== undefined) body.disabled_at = patch.disabledAt;
    if (patch.emailVerifiedAt !== undefined) body.email_verified_at = patch.emailVerifiedAt;
    await this.client.update("users", { id: eq(id) }, body);
  }

  // ── organizations ───────────────────────────────────────────────────
  async createOrganization(org: NewOrganization): Promise<Organization> {
    const row = await this.client.insert<OrganizationRow>("organizations", {
      name: org.name,
      slug: org.slug,
      owner_user_id: org.ownerUserId,
    });
    return orgFromRow(row);
  }

  async getOrganizationById(id: string): Promise<Organization | null> {
    const row = await this.client.selectOne<OrganizationRow>("organizations", { filters: { id: eq(id) } });
    return row ? orgFromRow(row) : null;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    const row = await this.client.selectOne<OrganizationRow>("organizations", { filters: { slug: eq(slug) } });
    return row ? orgFromRow(row) : null;
  }

  async listOrganizationsForUser(userId: string): Promise<Organization[]> {
    const memberships = await this.client.select<MembershipRow>("memberships", { filters: { user_id: eq(userId) } });
    if (memberships.length === 0) return [];
    const rows = await this.client.select<OrganizationRow>("organizations", {
      filters: { id: `in.(${memberships.map((m) => m.organization_id).join(",")})` },
    });
    return rows.map(orgFromRow);
  }

  // ── teams ───────────────────────────────────────────────────────────
  async createTeam(team: NewTeam): Promise<Team> {
    const row = await this.client.insert<TeamRow>("teams", { organization_id: team.organizationId, name: team.name });
    return teamFromRow(row);
  }

  async getTeamById(id: string): Promise<Team | null> {
    const row = await this.client.selectOne<TeamRow>("teams", { filters: { id: eq(id) } });
    return row ? teamFromRow(row) : null;
  }

  async listTeamsForOrganization(organizationId: string): Promise<Team[]> {
    const rows = await this.client.select<TeamRow>("teams", { filters: { organization_id: eq(organizationId) } });
    return rows.map(teamFromRow);
  }

  async deleteTeam(id: string): Promise<void> {
    await this.client.remove("team_members", { team_id: eq(id) });
    await this.client.remove("teams", { id: eq(id) });
  }

  // ── team members ────────────────────────────────────────────────────
  async addTeamMember(teamId: string, userId: string): Promise<TeamMember> {
    const row = await this.client.upsert<TeamMemberRow>("team_members", { team_id: teamId, user_id: userId }, "team_id,user_id");
    return teamMemberFromRow(row);
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    await this.client.remove("team_members", { team_id: eq(teamId), user_id: eq(userId) });
  }

  async listTeamMembers(teamId: string): Promise<TeamMember[]> {
    const rows = await this.client.select<TeamMemberRow>("team_members", { filters: { team_id: eq(teamId) } });
    return rows.map(teamMemberFromRow);
  }

  async listTeamsForUser(organizationId: string, userId: string): Promise<Team[]> {
    const memberRows = await this.client.select<TeamMemberRow>("team_members", { filters: { user_id: eq(userId) } });
    if (memberRows.length === 0) return [];
    const teamRows = await this.client.select<TeamRow>("teams", {
      filters: { id: `in.(${memberRows.map((m) => m.team_id).join(",")})`, organization_id: eq(organizationId) },
    });
    return teamRows.map(teamFromRow);
  }

  // ── memberships ─────────────────────────────────────────────────────
  async createMembership(membership: NewMembership): Promise<Membership> {
    const row = await this.client.insert<MembershipRow>("memberships", {
      user_id: membership.userId,
      organization_id: membership.organizationId,
      role_id: membership.roleId,
      status: membership.status ?? "active",
      invited_by: membership.invitedBy ?? null,
    });
    return membershipFromRow(row);
  }

  async getMembership(userId: string, organizationId: string): Promise<Membership | null> {
    const row = await this.client.selectOne<MembershipRow>("memberships", {
      filters: { user_id: eq(userId), organization_id: eq(organizationId) },
    });
    return row ? membershipFromRow(row) : null;
  }

  async listMembershipsForOrganization(organizationId: string): Promise<Membership[]> {
    const rows = await this.client.select<MembershipRow>("memberships", { filters: { organization_id: eq(organizationId) } });
    return rows.map(membershipFromRow);
  }

  async listMembershipsForUser(userId: string): Promise<Membership[]> {
    const rows = await this.client.select<MembershipRow>("memberships", { filters: { user_id: eq(userId) } });
    return rows.map(membershipFromRow);
  }

  async updateMembership(userId: string, organizationId: string, patch: { roleId?: string; status?: MembershipStatus }): Promise<void> {
    const body: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.roleId !== undefined) body.role_id = patch.roleId;
    if (patch.status !== undefined) body.status = patch.status;
    await this.client.update("memberships", { user_id: eq(userId), organization_id: eq(organizationId) }, body);
  }

  async removeMembership(userId: string, organizationId: string): Promise<void> {
    await this.client.remove("memberships", { user_id: eq(userId), organization_id: eq(organizationId) });
  }

  // ── roles & permissions ─────────────────────────────────────────────
  async createRole(role: NewRole): Promise<Role> {
    const row = await this.client.insert<RoleRow>("roles", {
      organization_id: role.organizationId,
      name: role.name,
      is_system: role.isSystem ?? false,
    });
    return roleFromRow(row);
  }

  async getRoleById(id: string): Promise<Role | null> {
    const row = await this.client.selectOne<RoleRow>("roles", { filters: { id: eq(id) } });
    return row ? roleFromRow(row) : null;
  }

  async getSystemRoleByName(name: string): Promise<Role | null> {
    const row = await this.client.selectOne<RoleRow>("roles", { filters: { name: eq(name), organization_id: "is.null" } });
    return row ? roleFromRow(row) : null;
  }

  async listRoles(organizationId: string | null): Promise<Role[]> {
    const rows = await this.client.select<RoleRow>("roles", {
      filters: { organization_id: organizationId === null ? "is.null" : eq(organizationId) },
    });
    return rows.map(roleFromRow);
  }

  async listAllPermissions(): Promise<Permission[]> {
    const rows = await this.client.select<PermissionRow>("permissions");
    return rows.map(permissionFromRow);
  }

  async getPermissionByKey(key: string): Promise<Permission | null> {
    const row = await this.client.selectOne<PermissionRow>("permissions", { filters: { key: eq(key) } });
    return row ? permissionFromRow(row) : null;
  }

  async getPermissionsForRole(roleId: string): Promise<Permission[]> {
    const links = await this.client.select<{ permission_id: string }>("role_permissions", {
      filters: { role_id: eq(roleId) },
      columns: "permission_id",
    });
    if (links.length === 0) return [];
    const rows = await this.client.select<PermissionRow>("permissions", {
      filters: { id: `in.(${links.map((l) => l.permission_id).join(",")})` },
    });
    return rows.map(permissionFromRow);
  }

  async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    await this.client.upsert("role_permissions", { role_id: roleId, permission_id: permissionId }, "role_id,permission_id");
  }

  // ── profiles ────────────────────────────────────────────────────────
  async getProfile(userId: string): Promise<Profile | null> {
    const row = await this.client.selectOne<ProfileRow>("profiles", { filters: { user_id: eq(userId) } });
    return row ? profileFromRow(row) : null;
  }

  async upsertProfile(userId: string, patch: ProfilePatch): Promise<Profile> {
    const body: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
    if (patch.displayName !== undefined) body.display_name = patch.displayName;
    if (patch.avatarUrl !== undefined) body.avatar_url = patch.avatarUrl;
    if (patch.timezone !== undefined) body.timezone = patch.timezone;
    if (patch.locale !== undefined) body.locale = patch.locale;
    if (patch.bio !== undefined) body.bio = patch.bio;
    const row = await this.client.upsert<ProfileRow>("profiles", body, "user_id");
    return profileFromRow(row);
  }

  // ── sessions ────────────────────────────────────────────────────────
  async createSession(session: NewSession): Promise<Session> {
    const row = await this.client.insert<SessionRow>("sessions", {
      user_id: session.userId,
      organization_id: session.organizationId,
      token_hash: session.tokenHash,
      user_agent: session.userAgent ?? null,
      ip_address: session.ipAddress ?? null,
      expires_at: session.expiresAt,
    });
    return sessionFromRow(row);
  }

  async getSessionByTokenHash(tokenHash: string): Promise<Session | null> {
    const row = await this.client.selectOne<SessionRow>("sessions", { filters: { token_hash: eq(tokenHash) } });
    return row ? sessionFromRow(row) : null;
  }

  async touchSession(id: string, patch: { lastSeenAt: string; organizationId?: string | null }): Promise<void> {
    const body: Record<string, unknown> = { last_seen_at: patch.lastSeenAt };
    if (patch.organizationId !== undefined) body.organization_id = patch.organizationId;
    await this.client.update("sessions", { id: eq(id) }, body);
  }

  async revokeSession(id: string): Promise<void> {
    await this.client.update("sessions", { id: eq(id) }, { revoked_at: new Date().toISOString() });
  }

  async revokeAllSessionsForUser(userId: string): Promise<void> {
    await this.client.update("sessions", { user_id: eq(userId), revoked_at: "is.null" }, { revoked_at: new Date().toISOString() });
  }

  // ── audit log ───────────────────────────────────────────────────────
  async recordAuditLog(entry: NewAuditLogEntry): Promise<AuditLogEntry> {
    const row = await this.client.insert<AuditLogRow>("audit_logs", {
      organization_id: entry.organizationId,
      actor_user_id: entry.actorUserId,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      metadata: entry.metadata ?? {},
    });
    return auditFromRow(row);
  }

  async listAuditLogs(filter: AuditLogFilter): Promise<AuditLogEntry[]> {
    const filters: Record<string, string> = {};
    if (filter.organizationId) filters.organization_id = eq(filter.organizationId);
    if (filter.actorUserId) filters.actor_user_id = eq(filter.actorUserId);
    if (filter.action) filters.action = eq(filter.action);
    if (filter.since) filters.created_at = `gte.${filter.since}`;
    const rows = await this.client.select<AuditLogRow>("audit_logs", {
      filters,
      order: "created_at.desc",
      limit: filter.limit,
    });
    return rows.map(auditFromRow);
  }
}
