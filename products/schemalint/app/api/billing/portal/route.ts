import { createBillingPortalSession, getSubscriptionForOrganization } from "@founder-os/platform/billing";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const subscription = await getSubscriptionForOrganization(organizationId);
    if (!subscription?.stripeCustomerId) {
      throw new PlatformError("NOT_FOUND", "No billing account found — subscribe to a paid plan first.");
    }

    const origin = new URL(request.url).origin;
    return createBillingPortalSession({ stripeCustomerId: subscription.stripeCustomerId, returnUrl: `${origin}/billing` });
  });
}
