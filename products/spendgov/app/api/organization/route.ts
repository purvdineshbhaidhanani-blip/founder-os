import { getOrganization, updateOrganization, updateOrganizationSchema } from "@founder-os/platform/organizations";
import { parseJsonBodyOrThrow } from "@founder-os/platform/api";
import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";

export async function GET() {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    return getOrganization({ organizationId, actor: { userId, organizationId } });
  });
}

export async function PATCH(request: Request) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    const input = await parseJsonBodyOrThrow(updateOrganizationSchema, request);
    return updateOrganization({ organizationId, actor: { userId, organizationId }, input });
  });
}
