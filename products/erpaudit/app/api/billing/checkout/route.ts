import { z } from "zod";
import { createCheckoutSession } from "@founder-os/platform/billing";
import { parseJsonBodyOrThrow } from "@founder-os/platform/api";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { resolveStripePriceId } from "../../../../lib/services/stripe-price-map.js";

const checkoutRequestSchema = z.object({
  planCode: z.enum(["starter", "pro"]),
});

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { planCode } = await parseJsonBodyOrThrow(checkoutRequestSchema, request);
    const stripePriceId = resolveStripePriceId(planCode);

    const origin = new URL(request.url).origin;
    return createCheckoutSession({
      organizationId,
      stripePriceId,
      successUrl: `${origin}/billing?checkout=success`,
      cancelUrl: `${origin}/billing?checkout=canceled`,
    });
  });
}
