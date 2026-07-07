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

/**
 * Every persistence operation the identity module needs, as one interface.
 * `InMemoryIdentityStore` (the zero-config default, used in tests and local
 * dev) and `PostgrestIdentityStore` (the production Supabase-backed
 * implementation) both satisfy this — no service in this module ever talks
 * to a database directly.
 */
export interface IdentityStore {
  // users
  createUser(user: NewUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  updateUser(id: string, patch: Partial<Pick<User, "passwordHash" | "lastLoginAt" | "disabledAt" | "emailVerifiedAt">>): Promise<void>;

  // organizations
  createOrganization(org: NewOrganization): Promise<Organization>;
  getOrganizationById(id: string): Promise<Organization | null>;
  getOrganizationBySlug(slug: string): Promise<Organization | null>;
  listOrganizationsForUser(userId: string): Promise<Organization[]>;

  // teams
  createTeam(team: NewTeam): Promise<Team>;
  getTeamById(id: string): Promise<Team | null>;
  listTeamsForOrganization(organizationId: string): Promise<Team[]>;
  deleteTeam(id: string): Promise<void>;

  // team members
  addTeamMember(teamId: string, userId: string): Promise<TeamMember>;
  removeTeamMember(teamId: string, userId: string): Promise<void>;
  listTeamMembers(teamId: string): Promise<TeamMember[]>;
  listTeamsForUser(organizationId: string, userId: string): Promise<Team[]>;

  // memberships
  createMembership(membership: NewMembership): Promise<Membership>;
  getMembership(userId: string, organizationId: string): Promise<Membership | null>;
  listMembershipsForOrganization(organizationId: string): Promise<Membership[]>;
  listMembershipsForUser(userId: string): Promise<Membership[]>;
  updateMembership(userId: string, organizationId: string, patch: { roleId?: string; status?: MembershipStatus }): Promise<void>;
  removeMembership(userId: string, organizationId: string): Promise<void>;

  // roles & permissions
  createRole(role: NewRole): Promise<Role>;
  getRoleById(id: string): Promise<Role | null>;
  getSystemRoleByName(name: string): Promise<Role | null>;
  listRoles(organizationId: string | null): Promise<Role[]>;
  listAllPermissions(): Promise<Permission[]>;
  getPermissionByKey(key: string): Promise<Permission | null>;
  getPermissionsForRole(roleId: string): Promise<Permission[]>;
  assignPermissionToRole(roleId: string, permissionId: string): Promise<void>;

  // profiles
  getProfile(userId: string): Promise<Profile | null>;
  upsertProfile(userId: string, patch: ProfilePatch): Promise<Profile>;

  // sessions
  createSession(session: NewSession): Promise<Session>;
  getSessionByTokenHash(tokenHash: string): Promise<Session | null>;
  touchSession(id: string, patch: { lastSeenAt: string; organizationId?: string | null }): Promise<void>;
  revokeSession(id: string): Promise<void>;
  revokeAllSessionsForUser(userId: string): Promise<void>;

  // audit log
  recordAuditLog(entry: NewAuditLogEntry): Promise<AuditLogEntry>;
  listAuditLogs(filter: AuditLogFilter): Promise<AuditLogEntry[]>;
}
