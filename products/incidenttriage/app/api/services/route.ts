import { parseJsonBodyOrThrow, parseSearchParamsOrThrow } from "@founder-os/platform/api";
import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { createServiceSchema, listServicesQuerySchema } from "../../../lib/validation/services.js";
import { createService, listServices } from "../../../lib/services/services-repo.js";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const url = new URL(request.url);
    const query = parseSearchParamsOrThrow(listServicesQuerySchema, url.searchParams);
    return listServices({ organizationId, query });
  });
}

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const input = await parseJsonBodyOrThrow(createServiceSchema, request);
    return createService({ organizationId, input });
  });
}
