import { listAuditLogForOrganization } from "@founder-os/platform/audit";
import { parseSearchParamsOrThrow, paginationQuerySchema } from "@founder-os/platform/api";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const url = new URL(request.url);
    const query = parseSearchParamsOrThrow(paginationQuerySchema, url.searchParams);
    return listAuditLogForOrganization({ organizationId, ...query });
  });
}
