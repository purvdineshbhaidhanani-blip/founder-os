import { PlatformError } from "@founder-os/platform/errors";
import { can, consumeAiCredit } from "@founder-os/platform/billing";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { generateCfoCopilotRecommendation, getLatestCfoCopilotRecommendation } from "../../../../lib/services/copilot.js";

export async function POST() {
  return withRouteHandler(async () => {
    const { organizationId, userId } = await requireOrganizationContext();
    if (!(await can(organizationId, "use_ai_cfo_copilot"))) {
      throw new PlatformError("UNAUTHORIZED", "The AI CFO Copilot requires the Starter plan or higher.");
    }
    return consumeAiCredit(organizationId, () => generateCfoCopilotRecommendation(organizationId, userId));
  });
}

export async function GET() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    return getLatestCfoCopilotRecommendation(organizationId);
  });
}
