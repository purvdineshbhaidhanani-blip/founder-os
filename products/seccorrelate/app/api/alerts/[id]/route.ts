import { parseJsonBodyOrThrow } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { updateAlertStatusSchema } from "../../../../lib/validation/log-events.js";
import { getAlert, updateAlertStatus } from "../../../../lib/services/alerts-repo.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const alert = await getAlert({ organizationId, alertId: id });
    if (!alert) throw new PlatformError("NOT_FOUND", "Alert not found.");
    return alert;
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const { status } = await parseJsonBodyOrThrow(updateAlertStatusSchema, request);
    const result = await updateAlertStatus({ organizationId, alertId: id, status });
    if (result.count === 0) throw new PlatformError("NOT_FOUND", "Alert not found.");
    return getAlert({ organizationId, alertId: id });
  });
}
