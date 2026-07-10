import { getEntitlementSummary, getSubscriptionForOrganization } from "@founder-os/platform/billing";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";

export async function GET() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const [subscription, entitlements] = await Promise.all([
      getSubscriptionForOrganization(organizationId),
      getEntitlementSummary(organizationId),
    ]);
    return { subscription, entitlements };
  });
}
