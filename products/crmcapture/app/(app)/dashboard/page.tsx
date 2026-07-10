import Link from "next/link";
import { KPICard } from "@founder-os/ui/dashboard";
import { getCRMCaptureDb } from "../../../lib/db.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { summarizeDashboard } from "../../../lib/services/dashboard.js";

export default async function DashboardPage() {
  const { organizationId } = await requireOrganizationContext();
  const db = getCRMCaptureDb();
  const leads = await db.lead.findMany({ where: { organizationId }, select: { status: true, score: true } });
  const contactCount = await db.contact.count({ where: { organizationId } });
  const summary = summarizeDashboard(leads);

  return (
    <div>
      <div className="cc-page-header">
        <div>
          <h1 className="cc-page-title">Dashboard</h1>
          <p className="cc-page-description">Your pipeline, at a glance.</p>
        </div>
        <Link href="/contacts" className="fos-btn fos-btn-primary fos-btn-sm">
          Add contact
        </Link>
      </div>

      <div className="cc-kpi-grid">
        <KPICard label="Contacts" value={String(contactCount)} />
        <KPICard label="New leads" value={String(summary.newLeadCount)} />
        <KPICard label="Qualified" value={String(summary.qualifiedLeadCount)} />
        <KPICard label="Avg. score" value={String(summary.averageScore)} />
      </div>

      <div className="cc-section">
        <h2 className="cc-section-title">Leads by status</h2>
        {Object.keys(summary.leadsByStatus).length === 0 ? (
          <p className="cc-page-description">No leads yet — add a contact and create a lead to get started.</p>
        ) : (
          <ul className="cc-category-list">
            {Object.entries(summary.leadsByStatus).map(([status, count]) => (
              <li key={status}>
                {status}: {count}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p>
        <Link href="/leads">View all leads →</Link>
      </p>
    </div>
  );
}
