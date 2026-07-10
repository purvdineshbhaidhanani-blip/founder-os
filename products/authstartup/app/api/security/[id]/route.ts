import { parseJsonBodyOrThrow } from "@founder-os/platform/api";
import { z } from "zod";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { getSecurityFinding, updateFindingStatus } from "../../../../lib/services/security-repo.js";

const updateStatusSchema = z.object({ status: z.enum(["open", "resolved", "dismissed"]) });

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const finding = await getSecurityFinding({ organizationId, findingId: id });
    if (!finding) throw new PlatformError("NOT_FOUND", "Finding not found.");
    return finding;
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const { status } = await parseJsonBodyOrThrow(updateStatusSchema, request);
    return updateFindingStatus({ organizationId, findingId: id, status });
  });
}
