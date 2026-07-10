import Link from "next/link";
import { KPICard } from "@founder-os/ui/dashboard";
import { getCodeAuditDb } from "../../../lib/db.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { averageHealthScore, summarizeDashboard } from "../../../lib/services/dashboard.js";

export default async function DashboardPage() {
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
  const summary = summarizeDashboard(findings);
  const healthScore = averageHealthScore(recentScans.map((s) => s.healthScore!));

  return (
    <div>
      <div className="ca-page-header">
        <div>
          <h1 className="ca-page-title">Dashboard</h1>
          <p className="ca-page-description">Your code health, at a glance.</p>
        </div>
        <Link href="/repositories" className="fos-btn fos-btn-primary fos-btn-sm">
          Add repository
        </Link>
      </div>

      <div className="ca-kpi-grid">
        <KPICard label="Health score" value={String(healthScore)} />
        <KPICard label="Open findings" value={String(summary.openFindingCount)} />
        <KPICard label="Critical (open)" value={String(summary.criticalOpenCount)} />
        <KPICard label="Repositories" value={String(repositoryCount)} />
      </div>

      <div className="ca-section">
        <h2 className="ca-section-title">Findings by category</h2>
        {Object.keys(summary.findingsByCategory).length === 0 ? (
          <p className="ca-page-description">No findings yet — add a repository and run your first scan.</p>
        ) : (
          <ul className="ca-category-list">
            {Object.entries(summary.findingsByCategory).map(([category, count]) => (
              <li key={category}>
                {category}: {count}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p>
        <Link href="/findings">View all findings →</Link>
      </p>
    </div>
  );
}
