import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { getSchemaLintDb } from "../../../lib/db.js";
import { summarizeDashboard, type DashboardFinding } from "../../../lib/services/dashboard.js";

export async function GET() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const db = getSchemaLintDb();
    const findings = await db.finding.findMany({ where: { organizationId }, select: { status: true, severity: true, category: true } });
    const tableCount = await db.schemaTable.count({ where: { organizationId } });
    const schemas = await db.databaseSchema.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 20, select: { healthScore: true } });
    const averageHealthScore = schemas.length === 0 ? 100 : Math.round(schemas.reduce((total, s) => total + s.healthScore, 0) / schemas.length);

    return {
      summary: summarizeDashboard(findings as DashboardFinding[]),
      tableCount,
      averageHealthScore,
      schemaCount: await db.databaseSchema.count({ where: { organizationId } }),
    };
  });
}
