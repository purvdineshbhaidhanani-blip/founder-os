import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { runWasteDetection, listWasteFindings } from "../../../../lib/services/findings-repo.js";

export async function POST() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    return runWasteDetection(organizationId);
  });
}

export async function GET() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    return listWasteFindings(organizationId);
  });
}
