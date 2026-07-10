import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { listAllActiveSubscriptions } from "../../../lib/services/subscriptions-repo.js";
import { summarizeDashboard } from "../../../lib/services/dashboard.js";
import { summarizeLicenseUtilization } from "../../../lib/services/license-utilization.js";
import { getUpcomingRenewals } from "../../../lib/services/renewals.js";
import { listDuplicateFindings, listWasteFindings, listVendorConsolidationRecommendations } from "../../../lib/services/findings-repo.js";

export async function GET() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const subscriptions = await listAllActiveSubscriptions(organizationId);

    const [duplicates, waste, vendors] = await Promise.all([
      listDuplicateFindings(organizationId),
      listWasteFindings(organizationId),
      listVendorConsolidationRecommendations(organizationId),
    ]);

    const totalPotentialSavingsCents =
      duplicates.reduce((sum, f) => sum + f.estimatedSavingsCents, 0) +
      waste.reduce((sum, f) => sum + f.estimatedSavingsCents, 0) +
      vendors.reduce((sum, f) => sum + f.estimatedSavingsCents, 0);

    return {
      summary: summarizeDashboard(subscriptions),
      licenseUtilization: summarizeLicenseUtilization(subscriptions),
      upcomingRenewals: getUpcomingRenewals(
        subscriptions.map((s) => ({ id: s.id, vendorName: s.vendorName, productName: s.productName, monthlyCostCents: s.monthlyCostCents, renewalDate: s.renewalDate })),
      ),
      openFindingsCount: duplicates.length + waste.length + vendors.length,
      totalPotentialSavingsCents,
    };
  });
}
