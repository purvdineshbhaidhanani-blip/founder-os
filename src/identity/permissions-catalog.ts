/**
 * The static permission catalog and default system-role mapping — kept as
 * TypeScript constants so application code (RBAC guards, seed verification)
 * references the same keys the SQL migration seeds, with no risk of a typo
 * silently creating a permission that exists in code but not in the
 * database, or vice versa.
 */
export const PERMISSIONS = {
  ORGANIZATION_MANAGE: "organization.manage",
  ORGANIZATION_DELETE: "organization.delete",
  MEMBERS_INVITE: "members.invite",
  MEMBERS_REMOVE: "members.remove",
  MEMBERS_ROLE_MANAGE: "members.role.manage",
  TEAMS_MANAGE: "teams.manage",
  AUDIT_VIEW: "audit.view",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = {
  [PERMISSIONS.ORGANIZATION_MANAGE]: "Update organization settings.",
  [PERMISSIONS.ORGANIZATION_DELETE]: "Delete the organization.",
  [PERMISSIONS.MEMBERS_INVITE]: "Invite or add members to the organization.",
  [PERMISSIONS.MEMBERS_REMOVE]: "Remove members from the organization.",
  [PERMISSIONS.MEMBERS_ROLE_MANAGE]: "Change a member's role.",
  [PERMISSIONS.TEAMS_MANAGE]: "Create, rename, delete teams and manage their membership.",
  [PERMISSIONS.AUDIT_VIEW]: "View the organization's audit log.",
};

export const SYSTEM_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
} as const;

export type SystemRoleName = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

/** Default permission set per system role — must match the seed in `0002_identity.sql`. */
export const DEFAULT_SYSTEM_ROLE_PERMISSIONS: Record<SystemRoleName, PermissionKey[]> = {
  [SYSTEM_ROLES.OWNER]: Object.values(PERMISSIONS),
  [SYSTEM_ROLES.ADMIN]: Object.values(PERMISSIONS).filter((key) => key !== PERMISSIONS.ORGANIZATION_DELETE),
  [SYSTEM_ROLES.MEMBER]: [],
};
