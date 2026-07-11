import { verifyStripeWebhookSignature, handleStripeWebhookEvent } from "@founder-os/platform/billing";
import { getPlatformEnv } from "@founder-os/platform/config";
import { toErrorResponseBody } from "@founder-os/platform/api";
import { generateRequestId } from "@founder-os/platform/logging";
import { captureError } from "@founder-os/platform/monitoring";
import { PlatformError } from "@founder-os/platform/errors";

/** Stripe requires the raw request body for signature verification — never JSON.parse before this. */
export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      throw new PlatformError("VALIDATION_ERROR", "Missing Stripe-Signature header.");
    }
    getPlatformEnv(); // throws if PLATFORM_* env is misconfigured before we touch Stripe at all

    const rawBody = await request.text();
    const event = verifyStripeWebhookSignature(rawBody, signature);
    await handleStripeWebhookEvent(event);

    return Response.json({ data: { received: true } });
  } catch (err) {
    if (!(err instanceof PlatformError)) {
      captureError(err, { feature: "payrollaudit.billing_webhook" });
    }
    const { body, status } = toErrorResponseBody(err, requestId);
    return Response.json(body, { status });
  }
}
