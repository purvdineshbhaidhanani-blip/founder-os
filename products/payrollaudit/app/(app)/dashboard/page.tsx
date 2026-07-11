import Link from "next/link";
import { KPICard } from "@founder-os/ui/dashboard";
import { getPayrollAuditDb } from "../../../lib/db.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { summarizeDashboard } from "../../../lib/services/dashboard.js";

export default async function DashboardPage() {
  const { organizationId } = await requireOrganizationContext();
  const db = getPayrollAuditDb();
  const findings = await db.finding.findMany({ where: { organizationId }, select: { status: true, severity: true, category: true } });
  const employeeCount = await db.employee.count({ where: { organizationId } });
  const recentRuns = await db.payrollRun.findMany({
    where: { organizationId, status: "completed" },
    orderBy: { startedAt: "desc" },
    take: 10,
    include: { company: true },
  });
  const summary = summarizeDashboard(findings as never);
  const averageComplianceScore = recentRuns.length === 0 ? 100 : Math.round(recentRuns.reduce((total, r) => total + r.complianceScore, 0) / recentRuns.length);

  return (
    <div>
      <div className="pa-page-header">
        <div>
          <h1 className="pa-page-title">Dashboard</h1>
          <p className="pa-page-description">Payroll accuracy and compliance at a glance.</p>
        </div>
        <Link href="/payroll-runs" className="fos-btn fos-btn-primary fos-btn-sm">
          New payroll run
        </Link>
      </div>

      <div className="pa-kpi-grid">
        <KPICard label="Employees" value={String(employeeCount)} />
        <KPICard label="Avg. compliance score" value={String(averageComplianceScore)} />
        <KPICard label="Open findings" value={String(summary.openFindingCount)} />
        <KPICard label="Critical open findings" value={String(summary.criticalOpenCount)} />
      </div>

      <div className="pa-section">
        <h2 className="pa-section-title">Recent payroll runs</h2>
        {recentRuns.length === 0 ? (
          <p className="pa-page-description">No payroll runs yet — import one to start validating.</p>
        ) : (
          <ul className="pa-category-list">
            {recentRuns.map((run) => (
              <li key={run.id}>
                <Link href={`/payroll-runs/${run.id}`}>
                  {run.company.name} — {new Date(run.periodStart).toLocaleDateString()} to {new Date(run.periodEnd).toLocaleDateString()} — score {run.complianceScore}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p>
        <Link href="/payroll-runs">View all payroll runs →</Link>
      </p>
    </div>
  );
}
