import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { getContactVerifyDb } from "../../../lib/db.js";
import { findAllDuplicateGroups } from "../../../lib/services/contacts-repo.js";
import { summarizeDashboard } from "../../../lib/services/dashboard.js";

export async function GET() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const db = getContactVerifyDb();
    const contacts = await db.contact.findMany({ where: { organizationId }, select: { emailStatus: true, healthScore: true } });
    const duplicateGroups = await findAllDuplicateGroups(organizationId);
    const duplicateContactCount = duplicateGroups.reduce((total, g) => total + g.contactIds.length, 0);

    return {
      summary: summarizeDashboard(contacts),
      duplicateGroupCount: duplicateGroups.length,
      duplicateContactCount,
    };
  });
}
