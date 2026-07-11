import { parseJsonBodyOrThrow, parseSearchParamsOrThrow } from "@founder-os/platform/api";
import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { createEmployeeSchema, listEmployeesQuerySchema } from "../../../lib/validation/employees.js";
import { createEmployee, listEmployees } from "../../../lib/services/employees-repo.js";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const url = new URL(request.url);
    const query = parseSearchParamsOrThrow(listEmployeesQuerySchema, url.searchParams);
    return listEmployees({ organizationId, query });
  });
}

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const input = await parseJsonBodyOrThrow(createEmployeeSchema, request);
    return createEmployee({ organizationId, input });
  });
}
