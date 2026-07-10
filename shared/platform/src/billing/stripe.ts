import Stripe from "stripe";
import { getPlatformEnv, isStripeConfigured } from "../config/index.js";
import { integrationNotConfiguredError, validationError } from "../errors/index.js";
import { activateSubscription, markPastDue, renewSubscriptionPeriod, cancelSubscription } from "./subscriptions.js";

/**
 * Stripe integration, built and wired per standards/security.md's Phase 1
 * rule: no client secret required to run — every function here fails
 * closed with INTEGRATION_NOT_CONFIGURED until STRIPE_SECRET_KEY is set in
 * Phase 2. No fake/placeholder key is ever invented.
 */

let client: Stripe | undefined;

function getStripeClient(): Stripe {
  if (!isStripeConfigured()) {
    throw integrationNotConfiguredError("Stripe");
  }
  if (!client) {
    client = new Stripe(getPlatformEnv().STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });
  }
  return client;
}

export async function createCheckoutSession(params: {
  organizationId: string;
  stripePriceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
}): Promise<{ checkoutUrl: string }> {
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: params.stripePriceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    customer_email: params.customerEmail,
    client_reference_id: params.organizationId,
    subscription_data: {
      metadata: { organizationId: params.organizationId },
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  return { checkoutUrl: session.url };
}

export async function createBillingPortalSession(params: { stripeCustomerId: string; returnUrl: string }): Promise<{ portalUrl: string }> {
  const stripe = getStripeClient();
  const session = await stripe.billingPortal.sessions.create({
    customer: params.stripeCustomerId,
    return_url: params.returnUrl,
  });
  return { portalUrl: session.url };
}

/**
 * Webhook signature verification per standards/api.md: "Webhook endpoints
 * verify signatures... on every inbound payload before processing." Never
 * trust an unverified Stripe payload.
 */
export function verifyStripeWebhookSignature(rawBody: string, signatureHeader: string): Stripe.Event {
  const env = getPlatformEnv();
  if (!isStripeConfigured() || !env.STRIPE_WEBHOOK_SECRET) {
    throw integrationNotConfiguredError("Stripe webhooks");
  }
  try {
    return getStripeClient().webhooks.constructEvent(rawBody, signatureHeader, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    throw validationError([{ field: "stripe-signature", issue: `Webhook signature verification failed: ${String(err)}` }]);
  }
}

/**
 * Dispatches a verified Stripe event to the corresponding subscription
 * lifecycle transition. The route handler calls
 * `verifyStripeWebhookSignature` first, then this — never processes an
 * unverified body.
 */
export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId = session.client_reference_id;
      if (organizationId && typeof session.customer === "string" && typeof session.subscription === "string") {
        await activateSubscription({
          organizationId,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
        });
      }
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const organizationId = invoice.subscription_details?.metadata?.organizationId;
      if (organizationId) {
        await renewSubscriptionPeriod({ organizationId, billingInterval: "monthly" });
      }
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const organizationId = invoice.subscription_details?.metadata?.organizationId;
      if (organizationId) {
        await markPastDue(organizationId);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const organizationId = subscription.metadata?.organizationId;
      if (organizationId) {
        await cancelSubscription({ organizationId, atPeriodEnd: false });
      }
      break;
    }
    default:
      // Unhandled event types are intentionally ignored, not errors — Stripe
      // sends many event types no product in this portfolio currently acts on.
      break;
  }
}
