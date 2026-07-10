import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { getScan } from "../../../../lib/services/scans-repo.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const scan = await getScan({ organizationId, scanId: id });
    if (!scan) throw new PlatformError("NOT_FOUND", "Scan not found.");
    return scan;
  });
}
