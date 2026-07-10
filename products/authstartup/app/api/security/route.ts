import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { listSecurityFindings } from "../../../lib/services/security-repo.js";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId") ?? undefined;
    return listSecurityFindings({ organizationId, projectId });
  });
}
