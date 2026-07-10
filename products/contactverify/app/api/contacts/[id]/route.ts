import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { getContact } from "../../../../lib/services/contacts-repo.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const contact = await getContact({ organizationId, contactId: id });
    if (!contact) throw new PlatformError("NOT_FOUND", "Contact not found.");
    return contact;
  });
}
