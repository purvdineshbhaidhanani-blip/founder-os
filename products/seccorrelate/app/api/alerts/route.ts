import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { listAlerts } from "../../../lib/services/alerts-repo.js";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    return listAlerts({ organizationId, status });
  });
}
