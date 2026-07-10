import { parseJsonBodyOrThrow, parseSearchParamsOrThrow } from "@founder-os/platform/api";
import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { createContactSchema, listContactsQuerySchema } from "../../../lib/validation/contacts.js";
import { createContact, listContacts } from "../../../lib/services/contacts-repo.js";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const url = new URL(request.url);
    const query = parseSearchParamsOrThrow(listContactsQuerySchema, url.searchParams);
    return listContacts({ organizationId, query });
  });
}

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const input = await parseJsonBodyOrThrow(createContactSchema, request);
    return createContact({ organizationId, input });
  });
}
