import { can, consumeAiCredit } from "@founder-os/platform/billing";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../../lib/organization-context.js";
import { generateAccuracyCopilotBrief } from "../../../../../lib/services/accuracy-copilot.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    if (!(await can(organizationId, "use_accuracy_score"))) {
      throw new PlatformError("UNAUTHORIZED", "AI Accuracy Copilot requires an active Starter, Pro, Business, or Enterprise plan.");
    }
    const { id } = await params;
    return consumeAiCredit(organizationId, () =>
      generateAccuracyCopilotBrief({ organizationId, transcriptId: id, requestedByUserId: userId }),
    );
  });
}
