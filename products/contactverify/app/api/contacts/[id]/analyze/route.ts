import { can, consumeAiCredit } from "@founder-os/platform/billing";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../../lib/organization-context.js";
import { generateHealthProfile } from "../../../../../lib/services/health-engine.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    if (!(await can(organizationId, "use_health_score"))) {
      throw new PlatformError("UNAUTHORIZED", "The AI Contact Health Engine requires the Starter plan or higher.");
    }
    const { id } = await params;
    const result = await consumeAiCredit(organizationId, () =>
      generateHealthProfile({ organizationId, contactId: id, requestedByUserId: userId }),
    );
    return result;
  });
}
