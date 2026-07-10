import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { findAllDuplicateGroups } from "../../../../lib/services/contacts-repo.js";
import { getContactVerifyDb } from "../../../../lib/db.js";

export async function GET() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const groups = await findAllDuplicateGroups(organizationId);
    const db = getContactVerifyDb();
    const contacts = await db.contact.findMany({ where: { organizationId } });
    return groups.map((group) => ({
      ...group,
      contacts: group.contactIds.map((id) => contacts.find((c) => c.id === id)!),
    }));
  });
}
