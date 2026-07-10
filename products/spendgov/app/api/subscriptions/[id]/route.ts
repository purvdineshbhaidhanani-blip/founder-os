import { parseJsonBodyOrThrow } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { updateSubscriptionSchema } from "../../../../lib/validation/subscriptions.js";
import { getSubscription, updateSubscription, deleteSubscription } from "../../../../lib/services/subscriptions-repo.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const subscription = await getSubscription({ organizationId, subscriptionId: id });
    if (!subscription) throw new PlatformError("NOT_FOUND", "Subscription not found.");
    return subscription;
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const input = await parseJsonBodyOrThrow(updateSubscriptionSchema, request);
    const result = await updateSubscription({ organizationId, subscriptionId: id, input });
    if (result.count === 0) throw new PlatformError("NOT_FOUND", "Subscription not found.");
    return getSubscription({ organizationId, subscriptionId: id });
  });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const result = await deleteSubscription({ organizationId, subscriptionId: id });
    if (result.count === 0) throw new PlatformError("NOT_FOUND", "Subscription not found.");
    return { deleted: true };
  });
}
