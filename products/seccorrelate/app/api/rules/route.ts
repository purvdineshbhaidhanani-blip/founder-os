import { parseJsonBodyOrThrow } from "@founder-os/platform/api";
import { can } from "@founder-os/platform/billing";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { createCorrelationRuleSchema } from "../../../lib/validation/log-events.js";
import { createCorrelationRule, listCorrelationRules } from "../../../lib/services/rules-repo.js";

export async function GET() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    return listCorrelationRules(organizationId);
  });
}

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    if (!(await can(organizationId, "use_ai_correlation"))) {
      throw new PlatformError("UNAUTHORIZED", "Correlation rules require the Starter plan or higher.");
    }
    const input = await parseJsonBodyOrThrow(createCorrelationRuleSchema, request);
    return createCorrelationRule({ organizationId, createdByUserId: userId, input });
  });
}
