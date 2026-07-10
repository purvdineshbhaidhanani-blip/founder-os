import { parseJsonBodyOrThrow, parseSearchParamsOrThrow } from "@founder-os/platform/api";
import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { createScanSchema, listScansQuerySchema } from "../../../lib/validation/scans.js";
import { createScan, listScans } from "../../../lib/services/scans-repo.js";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const url = new URL(request.url);
    const query = parseSearchParamsOrThrow(listScansQuerySchema, url.searchParams);
    return listScans({ organizationId, query });
  });
}

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    const input = await parseJsonBodyOrThrow(createScanSchema, request);
    return createScan({ organizationId, triggeredByUserId: userId, input });
  });
}
