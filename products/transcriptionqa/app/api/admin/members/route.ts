import { listOrganizationMembers } from "@founder-os/platform/organizations";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";

export async function GET() {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    return listOrganizationMembers({ organizationId, actor: { userId, organizationId } });
  });
}
