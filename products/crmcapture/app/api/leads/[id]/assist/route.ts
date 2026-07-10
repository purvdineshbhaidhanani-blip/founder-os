import { can } from "@founder-os/platform/billing";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../../lib/organization-context.js";
import { generateSalesAssistantSuggestion } from "../../../../../lib/services/sales-assistant.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    if (!(await can(organizationId, "use_ai_followup_email"))) {
      throw new PlatformError("UNAUTHORIZED", "The AI Sales Assistant requires the Pro plan.");
    }
    const { id } = await params;
    return generateSalesAssistantSuggestion({ organizationId, leadId: id, requestedByUserId: userId });
  });
}
