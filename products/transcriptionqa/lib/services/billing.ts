import { createPlan, setPlanEntitlement, getPlanByCode } from "@founder-os/platform/billing";
import { createSubscription as createBillingSubscription, getSubscriptionForOrganization } from "@founder-os/platform/billing";
import { can, withinLimit } from "@founder-os/platform/billing";

/**
 * Pricing tiers per products/transcriptionqa/docs/PRODUCT_IDENTITY.md
 * §21-22 — Free/Starter/Pro/Business/Enterprise, entitlements transcribed
 * verbatim from the "Entitlements Logic (Pricing Engine)" table, updated
 * per the Loop 2 commercial freeze (COMMERCIAL_FREEZE.md, TranscriptionQA
 * section). `use_domain_dictionary` gates domain terminology validation
 * (Starter+, not an AI feature — unchanged since Loop 1). `use_accuracy_score`
 * gates the AI Accuracy Copilot specifically (the killer feature) — now
 * credit-metered via `ai_credits_monthly` and unlocked from Starter instead
 * of Pro, per the Loop 2 pricing-model decision. The deterministic "Basic"
 * accuracy score in the table runs unconditionally in code for every tier,
 * matching the pattern used for CharacterConsistency's AI Character DNA gate.
 */
export const PLAN_DEFINITIONS = [
  {
    code: "free",
    name: "Free",
    priceCents: 0,
    booleans: {
      use_accuracy_score: false,
      use_speaker_detection: true,
      use_grammar_check: false,
      use_domain_dictionary: false,
      use_translation: false,
      use_compliance_detection: false,
      use_sentiment_analysis: false,
      use_api: false,
      use_webhooks: false,
      use_hipaa_deployment: false,
      use_sso: false,
    },
    limits: { audio_uploads_monthly: 5, processing_minutes_monthly: 60, ai_credits_monthly: 0 },
  },
  {
    code: "starter",
    name: "Starter",
    priceCents: 2900,
    booleans: {
      use_accuracy_score: true,
      use_speaker_detection: true,
      use_grammar_check: true,
      use_domain_dictionary: true,
      use_translation: false,
      use_compliance_detection: false,
      use_sentiment_analysis: false,
      use_api: false,
      use_webhooks: false,
      use_hipaa_deployment: false,
      use_sso: false,
    },
    limits: { audio_uploads_monthly: 100, processing_minutes_monthly: 500, ai_credits_monthly: 15 },
  },
  {
    code: "pro",
    name: "Pro",
    priceCents: 9900,
    booleans: {
      use_accuracy_score: true,
      use_speaker_detection: true,
      use_grammar_check: true,
      use_domain_dictionary: true,
      use_translation: true,
      use_compliance_detection: true,
      use_sentiment_analysis: true,
      use_api: true,
      use_webhooks: true,
      use_hipaa_deployment: false,
      use_sso: false,
    },
    limits: { audio_uploads_monthly: 500, processing_minutes_monthly: 2500, ai_credits_monthly: 100 },
  },
  {
    code: "business",
    name: "Business",
    priceCents: 22900,
    booleans: {
      use_accuracy_score: true,
      use_speaker_detection: true,
      use_grammar_check: true,
      use_domain_dictionary: true,
      use_translation: true,
      use_compliance_detection: true,
      use_sentiment_analysis: true,
      use_api: true,
      use_webhooks: true,
      use_hipaa_deployment: false,
      use_sso: false,
    },
    limits: { audio_uploads_monthly: 2000, processing_minutes_monthly: 10000, ai_credits_monthly: 300 },
  },
  {
    code: "enterprise",
    name: "Enterprise",
    priceCents: 0,
    booleans: {
      use_accuracy_score: true,
      use_speaker_detection: true,
      use_grammar_check: true,
      use_domain_dictionary: true,
      use_translation: true,
      use_compliance_detection: true,
      use_sentiment_analysis: true,
      use_api: true,
      use_webhooks: true,
      use_hipaa_deployment: true,
      use_sso: true,
    },
    limits: { audio_uploads_monthly: null, processing_minutes_monthly: null, ai_credits_monthly: null },
  },
] as const;

/** Idempotent: skips a plan that already exists, called from prisma/seed.ts. */
export async function seedPlans(): Promise<void> {
  for (const definition of PLAN_DEFINITIONS) {
    let plan;
    try {
      plan = await createPlan({ code: definition.code, name: definition.name, billingInterval: "monthly", priceCents: definition.priceCents, currency: "usd" });
    } catch {
      plan = await getPlanByCode(definition.code, "monthly");
    }
    if (!plan) continue;

    for (const [featureKey, boolValue] of Object.entries(definition.booleans)) {
      await setPlanEntitlement(plan.id, { featureKey, kind: "boolean", boolValue });
    }
    for (const [metricKey, numericLimit] of Object.entries(definition.limits)) {
      await setPlanEntitlement(plan.id, { featureKey: metricKey, kind: "numeric_limit", numericLimit });
    }
  }
}

/** Every new organization starts on a 14-day trial with full Pro entitlements, per the universal billing-states rule. */
export async function startTrialSubscription(organizationId: string) {
  const existing = await getSubscriptionForOrganization(organizationId);
  if (existing) return existing;
  return createBillingSubscription({ organizationId, planCode: "pro", billingInterval: "monthly", trialDays: 14 });
}

export { can, withinLimit, getSubscriptionForOrganization };
