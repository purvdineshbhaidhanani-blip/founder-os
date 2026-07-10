import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { getERPAuditDb } from "../../../lib/db.js";
import { summarizeDashboard } from "../../../lib/services/dashboard.js";

export async function GET() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const db = getERPAuditDb();
    const findings = await db.finding.findMany({ where: { organizationId }, select: { status: true, severity: true, category: true } });
    const instanceCount = await db.erpInstance.count({ where: { organizationId } });
    const recentScans = await db.scan.findMany({
      where: { organizationId, status: "completed", complianceScore: { not: null } },
      orderBy: { startedAt: "desc" },
      take: 20,
      select: { complianceScore: true },
    });
    const averageScore = recentScans.length === 0 ? 100 : Math.round(recentScans.reduce((total, s) => total + (s.complianceScore ?? 0), 0) / recentScans.length);

    return {
      summary: summarizeDashboard(findings),
      instanceCount,
      complianceScore: averageScore,
    };
  });
}
