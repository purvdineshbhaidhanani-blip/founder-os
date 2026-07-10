import { parseJsonBodyOrThrow, parseSearchParamsOrThrow } from "@founder-os/platform/api";
import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { createInstanceSchema, listInstancesQuerySchema } from "../../../lib/validation/instances.js";
import { createInstance, listInstances } from "../../../lib/services/instances-repo.js";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const url = new URL(request.url);
    const query = parseSearchParamsOrThrow(listInstancesQuerySchema, url.searchParams);
    return listInstances({ organizationId, query });
  });
}

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const input = await parseJsonBodyOrThrow(createInstanceSchema, request);
    return createInstance({ organizationId, input });
  });
}
