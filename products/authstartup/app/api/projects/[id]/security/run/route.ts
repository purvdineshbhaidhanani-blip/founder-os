import { withRouteHandler } from "../../../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../../../lib/organization-context.js";
import { runSecurityAdvisor } from "../../../../../../lib/services/security-repo.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    return runSecurityAdvisor({ organizationId, projectId: id });
  });
}
