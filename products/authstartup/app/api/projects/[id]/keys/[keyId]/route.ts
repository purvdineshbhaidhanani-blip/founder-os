import { withRouteHandler } from "../../../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../../../lib/organization-context.js";
import { revokeApiKey } from "../../../../../../lib/services/api-keys-repo.js";

interface RouteParams {
  params: Promise<{ id: string; keyId: string }>;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id, keyId } = await params;
    await revokeApiKey({ organizationId, projectId: id, apiKeyId: keyId });
    return { revoked: true };
  });
}
