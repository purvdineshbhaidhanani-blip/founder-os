import Link from "next/link";
import { KPICard } from "@founder-os/ui/dashboard";
import { getSecCorrelateDb } from "../../../lib/db.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { summarizeDashboard } from "../../../lib/services/dashboard.js";

export default async function DashboardPage() {
  const { organizationId } = await requireOrganizationContext();
  const db = getSecCorrelateDb();
  const alerts = await db.alert.findMany({ where: { organizationId }, select: { severity: true, status: true } });
  const logEventCountLast24h = await db.logEvent.count({
    where: { organizationId, occurredAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });
  const summary = summarizeDashboard(alerts);

  return (
    <div>
      <div className="sc-page-header">
        <div>
          <h1 className="sc-page-title">Dashboard</h1>
          <p className="sc-page-description">Everything your SOC needs to know right now.</p>
        </div>
        <Link href="/log-events" className="fos-btn fos-btn-primary fos-btn-sm">
          Ingest log event
        </Link>
      </div>

      <div className="sc-kpi-grid">
        <KPICard label="Open alerts" value={String(summary.openAlertCount)} />
        <KPICard label="Critical (open)" value={String(summary.criticalOpenCount)} />
        <KPICard label="High (open)" value={String(summary.highOpenCount)} />
        <KPICard label="Log events (24h)" value={String(logEventCountLast24h)} />
      </div>

      <div className="sc-section">
        <h2 className="sc-section-title">Alerts by severity</h2>
        {Object.keys(summary.alertsBySeverity).length === 0 ? (
          <p className="sc-page-description">No alerts yet — ingest log events and run your correlation rules to generate alerts.</p>
        ) : (
          <ul className="sc-category-list">
            {Object.entries(summary.alertsBySeverity).map(([severity, count]) => (
              <li key={severity}>
                {severity}: {count}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p>
        <Link href="/alerts">View all alerts →</Link>
      </p>
    </div>
  );
}
