import { can } from "@founder-os/platform/billing";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../../lib/organization-context.js";
import { generateFixSuggestion } from "../../../../../lib/services/fix-engine.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    if (!(await can(organizationId, "use_ai_fix_engine"))) {
      throw new PlatformError("UNAUTHORIZED", "The AI Fix Engine requires the Pro plan.");
    }
    const { id } = await params;
    return generateFixSuggestion({ organizationId, findingId: id, requestedByUserId: userId });
  });
}
