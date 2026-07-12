import { can, consumeAiCredit } from "@founder-os/platform/billing";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../../lib/organization-context.js";
import { generateAuditSummary } from "../../../../../lib/services/audit-summary.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    if (!(await can(organizationId, "use_ai_summary"))) {
      throw new PlatformError("UNAUTHORIZED", "AI audit summaries require the Starter plan or higher.");
    }
    const { id } = await params;
    return consumeAiCredit(organizationId, () =>
      generateAuditSummary({ organizationId, findingId: id, requestedByUserId: userId }),
    );
  });
}
