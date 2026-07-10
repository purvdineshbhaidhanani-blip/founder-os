import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { getCodeAuditDb } from "../../../lib/db.js";
import { averageHealthScore, summarizeDashboard } from "../../../lib/services/dashboard.js";

export async function GET() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const db = getCodeAuditDb();
    const findings = await db.finding.findMany({ where: { organizationId }, select: { severity: true, status: true, category: true } });
    const recentScans = await db.scan.findMany({
      where: { organizationId, status: "completed", healthScore: { not: null } },
      orderBy: { startedAt: "desc" },
      take: 20,
      select: { healthScore: true },
    });
    const repositoryCount = await db.repository.count({ where: { organizationId } });

    return {
      summary: summarizeDashboard(findings),
      healthScore: averageHealthScore(recentScans.map((s) => s.healthScore!)),
      repositoryCount,
    };
  });
}
