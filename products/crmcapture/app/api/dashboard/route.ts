import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { getCRMCaptureDb } from "../../../lib/db.js";
import { summarizeDashboard } from "../../../lib/services/dashboard.js";

export async function GET() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const db = getCRMCaptureDb();
    const leads = await db.lead.findMany({ where: { organizationId }, select: { status: true, score: true } });
    const contactCount = await db.contact.count({ where: { organizationId } });

    return {
      summary: summarizeDashboard(leads),
      contactCount,
      leadCount: leads.length,
    };
  });
}
