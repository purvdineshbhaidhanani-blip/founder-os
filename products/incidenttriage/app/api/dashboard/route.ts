import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { getIncidentTriageDb } from "../../../lib/db.js";
import { summarizeDashboard } from "../../../lib/services/dashboard.js";

export async function GET() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const db = getIncidentTriageDb();
    const incidents = await db.incident.findMany({ where: { organizationId }, select: { status: true, severity: true } });
    const services = await db.service.findMany({ where: { organizationId }, select: { id: true, name: true, status: true } });

    return {
      summary: summarizeDashboard(incidents),
      services,
    };
  });
}
