import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { getSchema } from "../../../../lib/services/schemas-repo.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const schema = await getSchema({ organizationId, schemaId: id });
    if (!schema) throw new PlatformError("NOT_FOUND", "Database schema not found.");
    return schema;
  });
}
