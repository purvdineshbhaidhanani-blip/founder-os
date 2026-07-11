import { can } from "@founder-os/platform/billing";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../../lib/organization-context.js";
import { generateCharacterDNA } from "../../../../../lib/services/character-dna.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    if (!(await can(organizationId, "use_story_memory"))) {
      throw new PlatformError("UNAUTHORIZED", "AI Character DNA requires the Pro plan.");
    }
    const { id } = await params;
    return generateCharacterDNA({ organizationId, characterId: id, requestedByUserId: userId });
  });
}
