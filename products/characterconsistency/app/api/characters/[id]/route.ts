import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { getCharacter } from "../../../../lib/services/characters-repo.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const character = await getCharacter({ organizationId, characterId: id });
    if (!character) throw new PlatformError("NOT_FOUND", "Character not found.");
    return character;
  });
}
