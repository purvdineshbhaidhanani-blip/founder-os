import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { getAuthStartupDb } from "../../../lib/db.js";
import { summarizeDashboard } from "../../../lib/services/dashboard.js";

export async function GET() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const db = getAuthStartupDb();
    const findings = await db.securityFinding.findMany({ where: { organizationId }, select: { status: true, severity: true } });
    const projectCount = await db.project.count({ where: { organizationId } });
    const projects = await db.project.findMany({ where: { organizationId }, select: { id: true } });
    const endUserCount = await db.endUser.count({ where: { projectId: { in: projects.map((p) => p.id) } } });

    return {
      summary: summarizeDashboard(findings),
      projectCount,
      endUserCount,
    };
  });
}
