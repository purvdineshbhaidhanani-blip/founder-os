import { can } from "@founder-os/platform/billing";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../../lib/organization-context.js";
import { generateDatabaseArchitectBrief } from "../../../../../lib/services/database-architect.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    if (!(await can(organizationId, "use_performance_advisor"))) {
      throw new PlatformError("UNAUTHORIZED", "AI Database Architect requires an active Pro or Enterprise plan.");
    }
    const { id } = await params;
    return generateDatabaseArchitectBrief({ organizationId, schemaId: id, requestedByUserId: userId });
  });
}
