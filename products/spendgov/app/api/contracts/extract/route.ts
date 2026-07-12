import { PlatformError } from "@founder-os/platform/errors";
import { can, consumeAiCredit } from "@founder-os/platform/billing";
import { parseJsonBodyOrThrow } from "@founder-os/platform/api";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { contractExtractionRequestSchema } from "../../../../lib/validation/subscriptions.js";
import { extractContractTerms, listContractExtractions } from "../../../../lib/services/contract-extraction.js";

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    if (!(await can(organizationId, "use_spend_optimization_ai"))) {
      throw new PlatformError("UNAUTHORIZED", "AI contract parsing requires the Starter plan or higher.");
    }
    const input = await parseJsonBodyOrThrow(contractExtractionRequestSchema, request);
    return consumeAiCredit(organizationId, () => extractContractTerms({ organizationId, extractedByUserId: userId, ...input }));
  });
}

export async function GET() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    return listContractExtractions(organizationId);
  });
}
