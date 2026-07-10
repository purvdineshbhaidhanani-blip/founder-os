import { parseJsonBodyOrThrow } from "@founder-os/platform/api";
import { withRouteHandler } from "../../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../../lib/organization-context.js";
import { createApiKeySchema } from "../../../../../lib/validation/projects.js";
import { createApiKey, listApiKeys } from "../../../../../lib/services/api-keys-repo.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    return listApiKeys({ organizationId, projectId: id });
  });
}

export async function POST(request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const input = await parseJsonBodyOrThrow(createApiKeySchema, request);
    return createApiKey({ organizationId, projectId: id, input });
  });
}
