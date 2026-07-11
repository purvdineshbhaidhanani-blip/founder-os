import { parseJsonBodyOrThrow, parseSearchParamsOrThrow } from "@founder-os/platform/api";
import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { createCompanySchema, listCompaniesQuerySchema } from "../../../lib/validation/companies.js";
import { createCompany, listCompanies } from "../../../lib/services/companies-repo.js";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const url = new URL(request.url);
    const query = parseSearchParamsOrThrow(listCompaniesQuerySchema, url.searchParams);
    return listCompanies({ organizationId, query });
  });
}

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const input = await parseJsonBodyOrThrow(createCompanySchema, request);
    return createCompany({ organizationId, input });
  });
}
