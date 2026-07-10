import { parseSearchParamsOrThrow } from "@founder-os/platform/api";
import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { listIncidentsQuerySchema } from "../../../lib/validation/alerts.js";
import { listIncidents } from "../../../lib/services/incidents-repo.js";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const url = new URL(request.url);
    const query = parseSearchParamsOrThrow(listIncidentsQuerySchema, url.searchParams);
    return listIncidents({ organizationId, query });
  });
}
