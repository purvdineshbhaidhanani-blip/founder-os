import { parseJsonBodyOrThrow, parseSearchParamsOrThrow } from "@founder-os/platform/api";
import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { createPayrollRunSchema, listPayrollRunsQuerySchema } from "../../../lib/validation/payroll-runs.js";
import { createPayrollRun, listPayrollRuns } from "../../../lib/services/payroll-runs-repo.js";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const url = new URL(request.url);
    const query = parseSearchParamsOrThrow(listPayrollRunsQuerySchema, url.searchParams);
    return listPayrollRuns({ organizationId, query });
  });
}

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    const input = await parseJsonBodyOrThrow(createPayrollRunSchema, request);
    return createPayrollRun({ organizationId, triggeredByUserId: userId, input });
  });
}
