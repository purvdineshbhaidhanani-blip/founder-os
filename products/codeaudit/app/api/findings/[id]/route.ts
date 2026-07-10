import { parseJsonBodyOrThrow } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { updateFindingStatusSchema } from "../../../../lib/validation/scans.js";
import { getFinding, updateFindingStatus } from "../../../../lib/services/findings-repo.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const finding = await getFinding({ organizationId, findingId: id });
    if (!finding) throw new PlatformError("NOT_FOUND", "Finding not found.");
    return finding;
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const { status } = await parseJsonBodyOrThrow(updateFindingStatusSchema, request);
    const result = await updateFindingStatus({ organizationId, findingId: id, status });
    if (result.count === 0) throw new PlatformError("NOT_FOUND", "Finding not found.");
    return getFinding({ organizationId, findingId: id });
  });
}
