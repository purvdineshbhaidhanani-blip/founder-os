import { parseJsonBodyOrThrow } from "@founder-os/platform/api";
import { can } from "@founder-os/platform/billing";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { extractContactSchema } from "../../../../lib/validation/contacts.js";
import { extractContactFromText } from "../../../../lib/services/lead-extraction.js";

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    if (!(await can(organizationId, "use_ai_lead_extraction"))) {
      throw new PlatformError("UNAUTHORIZED", "AI lead extraction requires the Starter plan or higher.");
    }
    const input = await parseJsonBodyOrThrow(extractContactSchema, request);
    return extractContactFromText({ organizationId, input });
  });
}
