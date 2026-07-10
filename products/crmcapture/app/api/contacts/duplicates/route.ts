import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { findDuplicateContacts } from "../../../../lib/services/contacts-repo.js";

export async function GET() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    return findDuplicateContacts(organizationId);
  });
}
