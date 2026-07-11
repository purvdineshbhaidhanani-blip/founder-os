import { parseJsonBodyOrThrow, parseSearchParamsOrThrow } from "@founder-os/platform/api";
import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { createTranscriptSchema, listTranscriptsQuerySchema } from "../../../lib/validation/transcripts.js";
import { createTranscript, listTranscripts } from "../../../lib/services/transcripts-repo.js";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const url = new URL(request.url);
    const query = parseSearchParamsOrThrow(listTranscriptsQuerySchema, url.searchParams);
    return listTranscripts({ organizationId, query });
  });
}

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    const input = await parseJsonBodyOrThrow(createTranscriptSchema, request);
    return createTranscript({ organizationId, createdByUserId: userId, input });
  });
}
