import type { FounderOpportunityReport } from "../opportunities/types.js";

/**
 * Founder Copilot — a PURE, deterministic, read-only Q&A surface over an
 * already-computed `FounderOpportunityReport`. No LLM call, no network, no
 * filesystem I/O, no mutation of the report it reads. Every answer string is
 * assembled ONLY from field VALUES already present on the report (primarily
 * `report.aiDecisionValidation.*`, plus `report.founderIntelligence`,
 * `report.decision`, and `report.fois` as read-only supporting context) —
 * this module never re-derives clustering/FOIS/decision/calibration/
 * founderIntelligence, and never invents a fact, price, or claim that isn't
 * traceable to a cited field. See copilot.ts's module doc for the exact
 * question-routing rule table.
 */

/** Re-exported for callers so they don't need a separate import from ../opportunities/types.js just to call this module. */
export type { FounderOpportunityReport };

/**
 * Fixed canonical topic vocabulary. `"unmatched"` is the honest fallback
 * used when a free-text question doesn't match any of the other topics'
 * keyword rules (see copilot.ts's `ROUTES`) — it is never silently coerced
 * into one of the real topics.
 *
 * The first 8 (`what-to-build` .. `launch`) are the original Loop-8-era
 * canonical topics (see `CANONICAL_FOUNDER_QUESTIONS`). The next 8
 * (`why-build` .. `market-weak`) are the Phase 9 additive expansion (see
 * `ADDITIONAL_FOUNDER_QUESTIONS`) — two of the ten requested Phase 9
 * questions ("What MVP?" and "What are the biggest risks?") are EXACT
 * duplicates of the existing `mvp`/`risks` topics and therefore reuse them
 * rather than getting their own topic.
 */
export type FounderCopilotTopic =
  | "what-to-build"
  | "why"
  | "customer"
  | "why-pay"
  | "risks"
  | "validation"
  | "mvp"
  | "launch"
  | "why-build"
  | "why-not-build"
  | "who-pays"
  | "how-price"
  | "what-build-first"
  | "differentiate"
  | "get-customers"
  | "market-weak"
  | "unmatched";

/**
 * One provenance record: the exact dotted/indexed path of the report field
 * an answer sentence was built from, and that field's own stringified
 * value at the time of the call. Every `FounderCopilotAnswer.citations`
 * entry must trace back to a real field that exists on
 * `FounderOpportunityReport` (see copilot.ts for the exact paths used,
 * grounded against src/opportunities/types.ts and
 * src/opportunities/ai-decision-validation.ts).
 */
export interface FounderCopilotCitation {
  /** e.g. "aiDecisionValidation.finalRecommendation.goToMarketDirection" */
  fieldPath: string;
  /** The cited field's own value, stringified (arrays are joined with "; "). Never a fabricated or reworded value. */
  value: string;
}

export interface FounderCopilotAnswer {
  /** The exact question string passed in (or the canonical question, for `answerAllFounderQuestions`). */
  question: string;
  topic: FounderCopilotTopic;
  /** Composed ONLY from cited field values — see copilot.ts's per-topic builder functions. */
  answer: string;
  citations: FounderCopilotCitation[];
  /**
   * True when at least one cited field is an honest "NOT VERIFIED"/"unknown"/
   * "not-verified" signal (or, for the "validation" topic, when real
   * unknowns were surfaced) — never fabricated to fill the gap. When true,
   * `answer` explicitly names which cited field(s) are unverified.
   */
  notVerified: boolean;
}
