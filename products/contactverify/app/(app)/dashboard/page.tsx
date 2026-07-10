import Link from "next/link";
import { KPICard } from "@founder-os/ui/dashboard";
import { getContactVerifyDb } from "../../../lib/db.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { findAllDuplicateGroups } from "../../../lib/services/contacts-repo.js";
import { summarizeDashboard } from "../../../lib/services/dashboard.js";

export default async function DashboardPage() {
  const { organizationId } = await requireOrganizationContext();
  const db = getContactVerifyDb();
  const contacts = await db.contact.findMany({ where: { organizationId }, select: { emailStatus: true, healthScore: true } });
  const duplicateGroups = await findAllDuplicateGroups(organizationId);
  const summary = summarizeDashboard(contacts);

  return (
    <div>
      <div className="cv-page-header">
        <div>
          <h1 className="cv-page-title">Dashboard</h1>
          <p className="cv-page-description">Your contact data quality, at a glance.</p>
        </div>
        <Link href="/contacts" className="fos-btn fos-btn-primary fos-btn-sm">
          Add contact
        </Link>
      </div>

      <div className="cv-kpi-grid">
        <KPICard label="Total contacts" value={String(summary.totalContacts)} />
        <KPICard label="Verified" value={String(summary.verifiedContacts)} />
        <KPICard label="Invalid" value={String(summary.invalidContacts)} />
        <KPICard label="Avg. health score" value={String(summary.averageHealthScore)} />
      </div>

      <div className="cv-section">
        <h2 className="cv-section-title">Duplicates</h2>
        {duplicateGroups.length === 0 ? (
          <p className="cv-page-description">No likely duplicates detected.</p>
        ) : (
          <p className="cv-page-description">{duplicateGroups.length} duplicate group(s) found across {duplicateGroups.reduce((t, g) => t + g.contactIds.length, 0)} contacts.</p>
        )}
      </div>

      <p>
        <Link href="/contacts">View all contacts →</Link>
      </p>
    </div>
  );
}
