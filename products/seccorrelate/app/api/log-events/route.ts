import { parseJsonBodyOrThrow, parseSearchParamsOrThrow } from "@founder-os/platform/api";
import { withinLimit } from "@founder-os/platform/billing";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { createLogEventSchema, listLogEventsQuerySchema } from "../../../lib/validation/log-events.js";
import { createLogEvent, listLogEvents } from "../../../lib/services/log-events-repo.js";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const url = new URL(request.url);
    const query = parseSearchParamsOrThrow(listLogEventsQuerySchema, url.searchParams);
    return listLogEvents({ organizationId, query });
  });
}

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const input = await parseJsonBodyOrThrow(createLogEventSchema, request);

    const limitCheck = await withinLimit(organizationId, "alert_ingestion_daily");
    if (!limitCheck.allowed) {
      throw new PlatformError("UNAUTHORIZED", `You've reached your plan's daily ingestion limit of ${limitCheck.limit} events. Upgrade your plan to ingest more.`);
    }

    return createLogEvent({ organizationId, input });
  });
}
