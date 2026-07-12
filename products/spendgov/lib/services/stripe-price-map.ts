import { PlatformError } from "@founder-os/platform/errors";

/**
 * Stripe Price IDs are per-Stripe-account configuration, not something
 * @founder-os/platform's product-agnostic Plan model should store — each
 * product has its own Stripe account and catalog. Resolved from env vars
 * here, following the same "built and wired, fails closed until set"
 * pattern as every other optional integration (standards/security.md).
 */
const PRICE_ID_ENV_VARS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_ID_STARTER_MONTHLY,
  pro: process.env.STRIPE_PRICE_ID_PRO_MONTHLY,
  business: process.env.STRIPE_PRICE_ID_BUSINESS_MONTHLY,
};

export function resolveStripePriceId(planCode: string): string {
  const priceId = PRICE_ID_ENV_VARS[planCode];
  if (!priceId) {
    throw new PlatformError(
      "INTEGRATION_NOT_CONFIGURED",
      `No Stripe price is configured for the "${planCode}" plan yet. Set STRIPE_PRICE_ID_${planCode.toUpperCase()}_MONTHLY.`,
    );
  }
  return priceId;
}
