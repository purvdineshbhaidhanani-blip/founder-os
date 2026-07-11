import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { getTranscript } from "../../../../lib/services/transcripts-repo.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const transcript = await getTranscript({ organizationId, transcriptId: id });
    if (!transcript) throw new PlatformError("NOT_FOUND", "Transcript not found.");
    return transcript;
  });
}
