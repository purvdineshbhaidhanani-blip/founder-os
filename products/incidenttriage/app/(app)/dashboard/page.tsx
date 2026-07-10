import Link from "next/link";
import { KPICard } from "@founder-os/ui/dashboard";
import { getIncidentTriageDb } from "../../../lib/db.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { summarizeDashboard } from "../../../lib/services/dashboard.js";

const STATUS_LABEL: Record<string, string> = { healthy: "Healthy", degraded: "Degraded", down: "Down" };

export default async function DashboardPage() {
  const { organizationId } = await requireOrganizationContext();
  const db = getIncidentTriageDb();
  const incidents = await db.incident.findMany({ where: { organizationId }, select: { status: true, severity: true } });
  const services = await db.service.findMany({ where: { organizationId }, orderBy: { name: "asc" } });
  const summary = summarizeDashboard(incidents);

  return (
    <div>
      <div className="it-page-header">
        <div>
          <h1 className="it-page-title">Dashboard</h1>
          <p className="it-page-description">Every service, every incident, at a glance.</p>
        </div>
        <Link href="/alerts" className="fos-btn fos-btn-primary fos-btn-sm">
          Ingest alert
        </Link>
      </div>

      <div className="it-kpi-grid">
        <KPICard label="Open incidents" value={String(summary.openIncidentCount)} />
        <KPICard label="Critical (open)" value={String(summary.criticalOpenCount)} />
        <KPICard label="Total incidents" value={String(summary.totalIncidentCount)} />
        <KPICard label="Services" value={String(services.length)} />
      </div>

      <div className="it-section">
        <h2 className="it-section-title">Service health</h2>
        {services.length === 0 ? (
          <p className="it-page-description">No services yet — add one to start ingesting alerts.</p>
        ) : (
          <ul className="it-category-list">
            {services.map((service) => (
              <li key={service.id}>
                {service.name}: {STATUS_LABEL[service.status]}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p>
        <Link href="/incidents">View all incidents →</Link>
      </p>
    </div>
  );
}
