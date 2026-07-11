import Link from "next/link";
import { KPICard } from "@founder-os/ui/dashboard";
import { getSchemaLintDb } from "../../../lib/db.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { summarizeDashboard } from "../../../lib/services/dashboard.js";

export default async function DashboardPage() {
  const { organizationId } = await requireOrganizationContext();
  const db = getSchemaLintDb();
  const findings = await db.finding.findMany({ where: { organizationId }, select: { status: true, severity: true, category: true } });
  const recentSchemas = await db.databaseSchema.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  const summary = summarizeDashboard(findings as never);
  const averageHealthScore = recentSchemas.length === 0 ? 100 : Math.round(recentSchemas.reduce((total, s) => total + s.healthScore, 0) / recentSchemas.length);

  return (
    <div>
      <div className="sl-page-header">
        <div>
          <h1 className="sl-page-title">Dashboard</h1>
          <p className="sl-page-description">Database schema health across your workspace.</p>
        </div>
        <Link href="/schemas" className="fos-btn fos-btn-primary fos-btn-sm">
          New schema
        </Link>
      </div>

      <div className="sl-kpi-grid">
        <KPICard label="Schemas" value={String(recentSchemas.length)} />
        <KPICard label="Avg. health score" value={String(averageHealthScore)} />
        <KPICard label="Open findings" value={String(summary.openFindingCount)} />
        <KPICard label="Critical open findings" value={String(summary.criticalOpenCount)} />
      </div>

      <div className="sl-section">
        <h2 className="sl-section-title">Recent schemas</h2>
        {recentSchemas.length === 0 ? (
          <p className="sl-page-description">No schemas yet — import one to see its health score.</p>
        ) : (
          <ul className="sl-category-list">
            {recentSchemas.map((schema) => (
              <li key={schema.id}>
                <Link href={`/schemas/${schema.id}`}>
                  {schema.name} ({schema.engine}) — score {schema.healthScore}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p>
        <Link href="/schemas">View all schemas →</Link>
      </p>
    </div>
  );
}
