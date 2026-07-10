import { listOrganizationsForUser } from "@founder-os/platform/organizations";
import { PlatformError } from "@founder-os/platform/errors";
import { requireCurrentSession } from "./auth.js";

export interface OrganizationContext {
  userId: string;
  organizationId: string;
  role: string;
}

/** Resolves the signed-in user's organization for this request — see products/spendgov/lib/organization-context.ts for the "first membership" rationale. */
export async function requireOrganizationContext(): Promise<OrganizationContext> {
  const session = await requireCurrentSession();
  const memberships = await listOrganizationsForUser(session.userId);
  const primary = memberships[0];
  if (!primary) {
    throw new PlatformError("NOT_FOUND", "No organization found for this account.");
  }
  return { userId: session.userId, organizationId: primary.organization.id, role: primary.role };
}
