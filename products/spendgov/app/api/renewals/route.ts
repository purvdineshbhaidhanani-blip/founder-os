import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { listAllActiveSubscriptions } from "../../../lib/services/subscriptions-repo.js";
import { getUpcomingRenewals } from "../../../lib/services/renewals.js";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const url = new URL(request.url);
    const lookaheadDays = Number(url.searchParams.get("lookaheadDays") ?? 90);

    const subscriptions = await listAllActiveSubscriptions(organizationId);
    return getUpcomingRenewals(
      subscriptions.map((s) => ({ id: s.id, vendorName: s.vendorName, productName: s.productName, monthlyCostCents: s.monthlyCostCents, renewalDate: s.renewalDate })),
      lookaheadDays,
    );
  });
}
