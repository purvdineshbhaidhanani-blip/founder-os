import { z } from "zod";
import { updateMemberRole, removeMember } from "@founder-os/platform/organizations";
import { parseJsonBodyOrThrow } from "@founder-os/platform/api";
import { withRouteHandler } from "../../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../../lib/organization-context.js";

const updateRoleSchema = z.object({ role: z.enum(["owner", "admin", "member"]) });

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    const { userId: targetUserId } = await params;
    const { role } = await parseJsonBodyOrThrow(updateRoleSchema, request);
    return updateMemberRole({ organizationId, targetUserId, role, actor: { userId, organizationId } });
  });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    const { userId: targetUserId } = await params;
    await removeMember({ organizationId, targetUserId, actor: { userId, organizationId } });
    return { removed: true };
  });
}
