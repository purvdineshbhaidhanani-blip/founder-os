import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { listAllActiveSubscriptions } from "../../../lib/services/subscriptions-repo.js";
import { getUpcomingRenewals } from "../../../lib/services/renewals.js";
import { EmptyState } from "@founder-os/ui/primitives";

export default async function RenewalsPage() {
  const { organizationId } = await requireOrganizationContext();
  const subscriptions = await listAllActiveSubscriptions(organizationId);
  const renewals = getUpcomingRenewals(
    subscriptions.map((s) => ({ id: s.id, vendorName: s.vendorName, productName: s.productName, monthlyCostCents: s.monthlyCostCents, renewalDate: s.renewalDate })),
  );

  return (
    <div>
      <div className="sg-page-header">
        <div>
          <h1 className="sg-page-title">Renewal calendar</h1>
          <p className="sg-page-description">Subscriptions renewing in the next 90 days, soonest first.</p>
        </div>
      </div>

      {renewals.length === 0 ? (
        <EmptyState title="No upcoming renewals" description="Nothing renews in the next 90 days, or renewal dates haven't been set yet." />
      ) : (
        renewals.map((renewal) => (
          <div key={renewal.subscriptionId} className="sg-copilot-action">
            <div className="sg-copilot-action-header">
              <strong>
                {renewal.vendorName} {renewal.productName}
              </strong>
              <span>${(renewal.monthlyCostCents / 100).toLocaleString()}/mo</span>
            </div>
            <p>
              Renews {renewal.renewalDate.toISOString().slice(0, 10)} — {renewal.daysUntilRenewal} days away.
            </p>
          </div>
        ))
      )}
    </div>
  );
}
