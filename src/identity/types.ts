/**
 * Domain types for the production identity foundation: users, organizations,
 * teams, RBAC (roles/permissions), profiles, database-backed sessions, and
 * the audit log. Mirrors the table shapes in
 * `supabase/migrations/0002_identity.sql` — camelCase here, snake_case in
 * Postgres, translated at the `IdentityStore` boundary.
 */

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewUser {
  email: string;
  passwordHash: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewOrganization {
  name: string;
  slug: string;
  ownerUserId: string;
}

export interface Team {
  id: string;
  organizationId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewTeam {
  organizationId: string;
  name: string;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  createdAt: string;
}

export type MembershipStatus = "active" | "invited" | "suspended";

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  roleId: string;
  status: MembershipStatus;
  invitedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewMembership {
  userId: string;
  organizationId: string;
  roleId: string;
  status?: MembershipStatus;
  invitedBy?: string | null;
}

export interface Role {
  id: string;
  organizationId: string | null;
  name: string;
  isSystem: boolean;
  createdAt: string;
}

export interface NewRole {
  organizationId: string | null;
  name: string;
  isSystem?: boolean;
}

export interface Permission {
  id: string;
  key: string;
  description: string;
  createdAt: string;
}

export interface Profile {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  timezone: string | null;
  locale: string | null;
  bio: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfilePatch {
  displayName?: string | null;
  avatarUrl?: string | null;
  timezone?: string | null;
  locale?: string | null;
  bio?: string | null;
}

export interface Session {
  id: string;
  userId: string;
  organizationId: string | null;
  tokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export interface NewSession {
  userId: string;
  organizationId: string | null;
  tokenHash: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: string;
}

export interface AuditLogEntry {
  id: string;
  organizationId: string | null;
  actorUserId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface NewAuditLogEntry {
  organizationId: string | null;
  actorUserId: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuditLogFilter {
  organizationId?: string;
  actorUserId?: string;
  action?: string;
  since?: string;
  limit?: number;
}
