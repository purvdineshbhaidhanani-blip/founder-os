import { parseJsonBodyOrThrow } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { updateProjectSchema } from "../../../../lib/validation/projects.js";
import { getProject, updateProject } from "../../../../lib/services/projects-repo.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const project = await getProject({ organizationId, projectId: id });
    if (!project) throw new PlatformError("NOT_FOUND", "Project not found.");
    return project;
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const input = await parseJsonBodyOrThrow(updateProjectSchema, request);
    return updateProject({ organizationId, projectId: id, input });
  });
}
