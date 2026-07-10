import { parseJsonBodyOrThrow, parseSearchParamsOrThrow } from "@founder-os/platform/api";
import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { createProjectSchema, listProjectsQuerySchema } from "../../../lib/validation/projects.js";
import { createProject, listProjects } from "../../../lib/services/projects-repo.js";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const url = new URL(request.url);
    const query = parseSearchParamsOrThrow(listProjectsQuerySchema, url.searchParams);
    return listProjects({ organizationId, query });
  });
}

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    const input = await parseJsonBodyOrThrow(createProjectSchema, request);
    return createProject({ organizationId, createdByUserId: userId, input });
  });
}
