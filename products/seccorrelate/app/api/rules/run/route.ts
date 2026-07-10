import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { runCorrelationEngine } from "../../../../lib/services/alerts-repo.js";

export async function POST() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    return runCorrelationEngine(organizationId);
  });
}
