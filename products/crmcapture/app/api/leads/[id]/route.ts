import { parseJsonBodyOrThrow } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { updateLeadSchema } from "../../../../lib/validation/leads.js";
import { getLead, updateLead } from "../../../../lib/services/leads-repo.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const lead = await getLead({ organizationId, leadId: id });
    if (!lead) throw new PlatformError("NOT_FOUND", "Lead not found.");
    return lead;
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const input = await parseJsonBodyOrThrow(updateLeadSchema, request);
    return updateLead({ organizationId, leadId: id, input });
  });
}
