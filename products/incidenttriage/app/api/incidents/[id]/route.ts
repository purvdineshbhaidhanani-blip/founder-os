import { parseJsonBodyOrThrow } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { updateIncidentStatusSchema } from "../../../../lib/validation/alerts.js";
import { getIncident, updateIncidentStatus } from "../../../../lib/services/incidents-repo.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const incident = await getIncident({ organizationId, incidentId: id });
    if (!incident) throw new PlatformError("NOT_FOUND", "Incident not found.");
    return incident;
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const { status } = await parseJsonBodyOrThrow(updateIncidentStatusSchema, request);
    return updateIncidentStatus({ organizationId, incidentId: id, status });
  });
}
