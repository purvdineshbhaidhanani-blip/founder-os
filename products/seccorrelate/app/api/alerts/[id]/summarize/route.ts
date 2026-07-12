import { can, consumeAiCredit } from "@founder-os/platform/billing";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../../lib/organization-context.js";
import { generateIncidentSummary } from "../../../../../lib/services/incident-summary.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    if (!(await can(organizationId, "use_ai_incident_summary"))) {
      throw new PlatformError("UNAUTHORIZED", "AI incident summaries require an active plan.");
    }
    const { id } = await params;
    // Entitlement gate above stays as-is (AI Investigate is available on every
    // plan per Loop 1); this is the additive Loop 2 credit meter on top of it —
    // a credit is only consumed once generateIncidentSummary resolves successfully.
    return consumeAiCredit(organizationId, () =>
      generateIncidentSummary({ organizationId, alertId: id, requestedByUserId: userId }),
    );
  });
}
