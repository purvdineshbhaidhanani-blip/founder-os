import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { getPayrollAuditDb } from "../../../lib/db.js";
import { summarizeDashboard, type DashboardFinding } from "../../../lib/services/dashboard.js";

export async function GET() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const db = getPayrollAuditDb();
    const findings = await db.finding.findMany({ where: { organizationId }, select: { status: true, severity: true, category: true } });
    const employeeCount = await db.employee.count({ where: { organizationId } });
    const companyCount = await db.company.count({ where: { organizationId } });
    const recentRuns = await db.payrollRun.findMany({
      where: { organizationId, status: "completed" },
      orderBy: { startedAt: "desc" },
      take: 20,
      select: { complianceScore: true },
    });
    const averageComplianceScore = recentRuns.length === 0 ? 100 : Math.round(recentRuns.reduce((total, r) => total + r.complianceScore, 0) / recentRuns.length);

    return {
      summary: summarizeDashboard(findings as DashboardFinding[]),
      employeeCount,
      companyCount,
      averageComplianceScore,
      payrollRunCount: await db.payrollRun.count({ where: { organizationId } }),
    };
  });
}
