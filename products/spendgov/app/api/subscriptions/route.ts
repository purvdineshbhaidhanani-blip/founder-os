import { parseJsonBodyOrThrow, parseSearchParamsOrThrow } from "@founder-os/platform/api";
import { withinLimit } from "@founder-os/platform/billing";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { createSubscriptionSchema, listSubscriptionsQuerySchema } from "../../../lib/validation/subscriptions.js";
import { createSubscription, listSubscriptions } from "../../../lib/services/subscriptions-repo.js";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const url = new URL(request.url);
    const query = parseSearchParamsOrThrow(listSubscriptionsQuerySchema, url.searchParams);
    return listSubscriptions({ organizationId, query });
  });
}

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    const input = await parseJsonBodyOrThrow(createSubscriptionSchema, request);

    const limitKey = input.kind === "ai_tool" ? "ai_tools_tracked" : "saas_apps_tracked";
    const limitCheck = await withinLimit(organizationId, limitKey);
    if (!limitCheck.allowed) {
      throw new PlatformError(
        "UNAUTHORIZED",
        `You've reached your plan's limit of ${limitCheck.limit} tracked ${input.kind === "ai_tool" ? "AI tools" : "SaaS apps"}. Upgrade your plan to track more.`,
      );
    }

    return createSubscription({ organizationId, createdByUserId: userId, input });
  });
}
