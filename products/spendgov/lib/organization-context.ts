import { listOrganizationsForUser } from "@founder-os/platform/organizations";
import { PlatformError } from "@founder-os/platform/errors";
import { requireCurrentSession } from "./auth.js";

export interface OrganizationContext {
  userId: string;
  organizationId: string;
  role: string;
}

/**
 * Resolves the signed-in user's organization for this request. SpendGov's
 * Free tier caps an account at one organization (per PRODUCT_IDENTITY.md
 * §21), so "first membership, oldest first" is an unambiguous choice even
 * once Starter/Pro allow more than one — an explicit org-switcher is
 * future work once a customer actually has multiple.
 */
export async function requireOrganizationContext(): Promise<OrganizationContext> {
  const session = await requireCurrentSession();
  const memberships = await listOrganizationsForUser(session.userId);
  const primary = memberships[0];
  if (!primary) {
    throw new PlatformError("NOT_FOUND", "No organization found for this account.");
  }
  return { userId: session.userId, organizationId: primary.organization.id, role: primary.role };
}
