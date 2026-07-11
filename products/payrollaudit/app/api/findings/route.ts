import { parseSearchParamsOrThrow } from "@founder-os/platform/api";
import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { listFindingsQuerySchema } from "../../../lib/validation/payroll-runs.js";
import { listFindings } from "../../../lib/services/findings-repo.js";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const url = new URL(request.url);
    const query = parseSearchParamsOrThrow(listFindingsQuerySchema, url.searchParams);
    return listFindings({ organizationId, query });
  });
}
