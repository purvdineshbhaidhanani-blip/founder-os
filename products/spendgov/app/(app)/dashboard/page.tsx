import Link from "next/link";
import { KPICard, AlertList, type DashboardAlert } from "@founder-os/ui/dashboard";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { listAllActiveSubscriptions } from "../../../lib/services/subscriptions-repo.js";
import { summarizeDashboard } from "../../../lib/services/dashboard.js";
import { getUpcomingRenewals } from "../../../lib/services/renewals.js";
import { listDuplicateFindings, listWasteFindings, listVendorConsolidationRecommendations } from "../../../lib/services/findings-repo.js";

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default async function DashboardPage() {
  const { organizationId } = await requireOrganizationContext();
  const subscriptions = await listAllActiveSubscriptions(organizationId);
  const summary = summarizeDashboard(subscriptions);
  const renewals = getUpcomingRenewals(
    subscriptions.map((s) => ({ id: s.id, vendorName: s.vendorName, productName: s.productName, monthlyCostCents: s.monthlyCostCents, renewalDate: s.renewalDate })),
    30,
  );

  const [duplicates, waste, vendors] = await Promise.all([
    listDuplicateFindings(organizationId),
    listWasteFindings(organizationId),
    listVendorConsolidationRecommendations(organizationId),
  ]);

  const totalPotentialSavingsCents =
    duplicates.reduce((sum, f) => sum + f.estimatedSavingsCents, 0) +
    waste.reduce((sum, f) => sum + f.estimatedSavingsCents, 0) +
    vendors.reduce((sum, f) => sum + f.estimatedSavingsCents, 0);

  const alerts: DashboardAlert[] = [
    ...waste.slice(0, 3).map((finding) => ({
      id: finding.id,
      severity: "warning" as const,
      title: `${finding.subscription.productName}: ${finding.type.replace("_", " ")}`,
      description: finding.evidence,
    })),
    ...renewals.slice(0, 3).map((renewal) => ({
      id: renewal.subscriptionId,
      severity: (renewal.daysUntilRenewal <= 14 ? "critical" : "info") as DashboardAlert["severity"],
      title: `${renewal.vendorName} ${renewal.productName} renews in ${renewal.daysUntilRenewal} days`,
      description: `${formatCents(renewal.monthlyCostCents)}/mo`,
    })),
  ];

  return (
    <div>
      <div className="sg-page-header">
        <div>
          <h1 className="sg-page-title">Dashboard</h1>
          <p className="sg-page-description">Everything your finance team is spending on SaaS and AI, in one place.</p>
        </div>
        <Link href="/subscriptions" className="fos-btn fos-btn-primary fos-btn-sm">
          Add subscription
        </Link>
      </div>

      <div className="sg-kpi-grid">
        <KPICard label="Total monthly spend" value={formatCents(summary.totalMonthlySpendCents)} />
        <KPICard label="SaaS spend" value={formatCents(summary.saasMonthlySpendCents)} />
        <KPICard label="AI tool spend" value={formatCents(summary.aiToolMonthlySpendCents)} />
        <KPICard label="Potential savings found" value={formatCents(totalPotentialSavingsCents)} />
      </div>

      <div className="sg-section">
        <div className="sg-section-header">
          <h2 className="sg-section-title">
            Alerts
          </h2>
        </div>
        <AlertList alerts={alerts} emptyDescription="No urgent waste or renewals right now — check back after your next scan." />
      </div>

      <div className="sg-section">
        <div className="sg-section-header">
          <h2 className="sg-section-title">
            Spend by category
          </h2>
        </div>
        {summary.spendByCategory.length === 0 ? (
          <p className="sg-page-description">Add your first subscription to see a category breakdown.</p>
        ) : (
          <ul className="sg-category-list">
            {summary.spendByCategory.map((category) => (
              <li key={category.category}>
                {category.category}: {formatCents(category.monthlyCostCents)}/mo ({category.subscriptionCount} tools)
              </li>
            ))}
          </ul>
        )}
      </div>

      <p>
        <Link href="/subscriptions">View all subscriptions →</Link>
      </p>
    </div>
  );
}
