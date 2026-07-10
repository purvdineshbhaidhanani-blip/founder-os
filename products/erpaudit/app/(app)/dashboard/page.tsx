import Link from "next/link";
import { KPICard } from "@founder-os/ui/dashboard";
import { getERPAuditDb } from "../../../lib/db.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { summarizeDashboard } from "../../../lib/services/dashboard.js";

export default async function DashboardPage() {
  const { organizationId } = await requireOrganizationContext();
  const db = getERPAuditDb();
  const findings = await db.finding.findMany({ where: { organizationId }, select: { status: true, severity: true, category: true } });
  const instances = await db.erpInstance.findMany({ where: { organizationId } });
  const recentScans = await db.scan.findMany({
    where: { organizationId, status: "completed", complianceScore: { not: null } },
    orderBy: { startedAt: "desc" },
    take: 20,
    select: { complianceScore: true },
  });
  const averageScore = recentScans.length === 0 ? 100 : Math.round(recentScans.reduce((total, s) => total + (s.complianceScore ?? 0), 0) / recentScans.length);
  const summary = summarizeDashboard(findings);

  return (
    <div>
      <div className="ea-page-header">
        <div>
          <h1 className="ea-page-title">Dashboard</h1>
          <p className="ea-page-description">Your ERP compliance posture, at a glance.</p>
        </div>
        <Link href="/instances" className="fos-btn fos-btn-primary fos-btn-sm">
          Add ERP instance
        </Link>
      </div>

      <div className="ea-kpi-grid">
        <KPICard label="Compliance score" value={String(averageScore)} />
        <KPICard label="Open findings" value={String(summary.openFindingCount)} />
        <KPICard label="SoD violations (open)" value={String(summary.sodViolationCount)} />
        <KPICard label="ERP instances" value={String(instances.length)} />
      </div>

      <div className="ea-section">
        <h2 className="ea-section-title">ERP instances</h2>
        {instances.length === 0 ? (
          <p className="ea-page-description">No instances yet — add one to start importing configuration exports.</p>
        ) : (
          <ul className="ea-category-list">
            {instances.map((instance) => (
              <li key={instance.id}>
                {instance.name} ({instance.erpSystem})
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
