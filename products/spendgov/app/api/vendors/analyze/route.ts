import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { runVendorConsolidationAnalysis, listVendorConsolidationRecommendations } from "../../../../lib/services/findings-repo.js";

export async function POST() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    return runVendorConsolidationAnalysis(organizationId);
  });
}

export async function GET() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    return listVendorConsolidationRecommendations(organizationId);
  });
}
