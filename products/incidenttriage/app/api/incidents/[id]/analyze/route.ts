import { withRouteHandler } from "../../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../../lib/organization-context.js";
import { generateRootCauseAnalysis } from "../../../../../lib/services/root-cause-copilot.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    const { id } = await params;
    return generateRootCauseAnalysis({ organizationId, incidentId: id, requestedByUserId: userId });
  });
}
