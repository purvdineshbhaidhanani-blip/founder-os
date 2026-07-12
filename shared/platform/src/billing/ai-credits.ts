import { unauthorizedError } from "../errors/index.js";
import { withinLimit } from "./entitlements.js";
import { incrementUsage } from "./usage.js";

/**
 * The single metric key every product's AI Credit system (COMMERCIAL_FREEZE.md
 * §Section 1) is seeded under. One shared key, not a per-product name, so this
 * helper never needs a product-specific parameter — the per-product credit
 * *allotments* differ (seeded into each product's own PLAN_DEFINITIONS), but
 * the metric key and the check-then-increment mechanics are identical
 * everywhere, per the "never duplicate code" rule.
 */
const AI_CREDITS_METRIC_KEY = "ai_credits_monthly";

/**
 * Every AI-labeled route across all 12 products calls this once, immediately
 * before invoking the LLM, and nowhere else — replaces the old pattern of a
 * route hand-rolling `withinLimit` + a 403 + `incrementUsage` around its AI
 * call (previously duplicated with minor variations in every product).
 *
 * Throws (fails closed) if the org has no `ai_credits_monthly` credits left
 * this billing period, mirroring the same 403 UNAUTHORIZED shape used by
 * every other entitlement check in this module — callers don't need a
 * separate error branch for "out of AI credits" vs. "plan doesn't include
 * this feature."
 *
 * Only increments on the caller's successful path: call this, run the AI
 * generation, and only call `recordAiCreditUsage` after the LLM call
 * actually succeeds — so a failed generation (e.g. AI_PROVIDER_UNAVAILABLE)
 * never burns a credit. See consumeAiCredit() below for the common case
 * where check-then-record can be combined around a single async block.
 */
export async function assertAiCreditAvailable(organizationId: string): Promise<void> {
  const result = await withinLimit(organizationId, AI_CREDITS_METRIC_KEY);
  if (!result.allowed) {
    throw unauthorizedError(
      result.limit === 0
        ? "This plan doesn't include AI credits. Upgrade to Starter or higher to use this AI feature."
        : `You've used all ${result.limit} AI credits for this billing period. Upgrade your plan for more, or wait for your next billing cycle.`,
    );
  }
}

export async function recordAiCreditUsage(organizationId: string): Promise<void> {
  await incrementUsage({ organizationId, metricKey: AI_CREDITS_METRIC_KEY, amount: 1 });
}

/**
 * Wraps a single AI generation with the check-then-record pattern every
 * product's AI route needs: verifies a credit is available, runs `generate`,
 * and only records usage if `generate` resolves successfully — a thrown
 * error (including the shared AI router's INTEGRATION_NOT_CONFIGURED /
 * 503 fail-closed path) never consumes a credit.
 */
export async function consumeAiCredit<T>(organizationId: string, generate: () => Promise<T>): Promise<T> {
  await assertAiCreditAvailable(organizationId);
  const result = await generate();
  await recordAiCreditUsage(organizationId);
  return result;
}

export { AI_CREDITS_METRIC_KEY };
