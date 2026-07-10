import type { OrgRole } from "@prisma/client";
import { getPlatformDb } from "../db/index.js";
import { unauthorizedError } from "../errors/index.js";

/**
 * Centralized policy function per standards/security.md: "Prefer centralized
 * policy functions (can(user, action, resource)) over scattered inline role
 * checks, so the rules are auditable in one place." Every product route
 * calls this — never a hand-rolled `if (role === "admin")` inline.
 *
 * Base roles are the standards/security.md minimum: owner, admin, member.
 * Products add domain-specific roles (SpendGov's "finance_lead",
 * SecCorrelate's "threat_hunter") via OrganizationMember.productRole — that
 * field is available to product-specific authorization layered on top of
 * this base matrix, not a replacement for it. A product-specific check
 * always calls `can()` first for the base action, then applies its own
 * additional product-role rule if it needs finer granularity.
 */
export type OrgAction =
  | "organization.view"
  | "organization.update"
  | "organization.delete"
  | "organization.manage_billing"
  | "member.invite"
  | "member.remove"
  | "member.update_role"
  | "member.view"
  | "team.create"
  | "team.update"
  | "team.delete"
  | "team.manage_members"
  | "audit_log.view"
  | "settings.manage"
  | "api_key.manage";

const ROLE_PERMISSIONS: Record<OrgRole, ReadonlySet<OrgAction>> = {
  owner: new Set<OrgAction>([
    "organization.view",
    "organization.update",
    "organization.delete",
    "organization.manage_billing",
    "member.invite",
    "member.remove",
    "member.update_role",
    "member.view",
    "team.create",
    "team.update",
    "team.delete",
    "team.manage_members",
    "audit_log.view",
    "settings.manage",
    "api_key.manage",
  ]),
  admin: new Set<OrgAction>([
    "organization.view",
    "organization.update",
    "member.invite",
    "member.remove",
    "member.update_role",
    "member.view",
    "team.create",
    "team.update",
    "team.delete",
    "team.manage_members",
    "audit_log.view",
    "settings.manage",
    "api_key.manage",
  ]),
  member: new Set<OrgAction>(["organization.view", "member.view"]),
};

export interface RbacActor {
  userId: string;
  organizationId: string;
}

/**
 * Loads the actor's membership and evaluates the permission matrix. Returns
 * false (never throws) for "not a member at all" — callers that need a
 * hard failure use requireCan below, which throws the standard
 * unauthorizedError so route handlers don't have to remember to check.
 */
export async function can(actor: RbacActor, action: OrgAction): Promise<boolean> {
  const membership = await getPlatformDb().organizationMember.findUnique({
    where: { uq_organization_members_org_user: { organizationId: actor.organizationId, userId: actor.userId } },
  });
  if (!membership) return false;
  return ROLE_PERMISSIONS[membership.role].has(action);
}

export async function requireCan(actor: RbacActor, action: OrgAction): Promise<void> {
  const allowed = await can(actor, action);
  if (!allowed) {
    throw unauthorizedError(`You do not have permission to perform "${action}" in this organization.`);
  }
}

export async function getMembership(params: { organizationId: string; userId: string }) {
  return getPlatformDb().organizationMember.findUnique({
    where: { uq_organization_members_org_user: { organizationId: params.organizationId, userId: params.userId } },
  });
}
