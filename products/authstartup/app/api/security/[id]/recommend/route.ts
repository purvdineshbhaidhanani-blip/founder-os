import { can } from "@founder-os/platform/billing";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../../lib/organization-context.js";
import { generateSecurityRecommendation } from "../../../../../lib/services/security-advisor.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    if (!(await can(organizationId, "use_ai_security_advisor"))) {
      throw new PlatformError("UNAUTHORIZED", "The AI Security Advisor requires the Pro plan.");
    }
    const { id } = await params;
    return generateSecurityRecommendation({ organizationId, findingId: id, requestedByUserId: userId });
  });
}
