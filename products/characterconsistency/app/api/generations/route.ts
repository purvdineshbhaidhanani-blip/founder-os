import { parseJsonBodyOrThrow, parseSearchParamsOrThrow } from "@founder-os/platform/api";
import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { createGenerationSchema, listGenerationsQuerySchema } from "../../../lib/validation/characters.js";
import { createGeneration, listGenerations } from "../../../lib/services/generations-repo.js";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const url = new URL(request.url);
    const query = parseSearchParamsOrThrow(listGenerationsQuerySchema, url.searchParams);
    return listGenerations({ organizationId, query });
  });
}

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    const input = await parseJsonBodyOrThrow(createGenerationSchema, request);
    return createGeneration({ organizationId, requestedByUserId: userId, input });
  });
}
