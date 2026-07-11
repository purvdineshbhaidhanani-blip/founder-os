import { parseJsonBodyOrThrow, parseSearchParamsOrThrow } from "@founder-os/platform/api";
import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { createCharacterSchema, listCharactersQuerySchema } from "../../../lib/validation/characters.js";
import { createCharacter, listCharacters } from "../../../lib/services/characters-repo.js";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const url = new URL(request.url);
    const query = parseSearchParamsOrThrow(listCharactersQuerySchema, url.searchParams);
    return listCharacters({ organizationId, query });
  });
}

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    const input = await parseJsonBodyOrThrow(createCharacterSchema, request);
    return createCharacter({ organizationId, createdByUserId: userId, input });
  });
}
