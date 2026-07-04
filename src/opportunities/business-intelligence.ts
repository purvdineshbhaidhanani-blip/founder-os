import type {
  EnterpriseVsSmb,
  FounderOpportunityReport,
  FounderPricingModel,
  MonetizationSupportLabel,
  OpenSourceVsSaas,
  PricingConfidence,
} from "./types.js";

/**
 * Phase 1 — Business Intelligence layer.
 *
 * A pure COMPOSITION layer over fields already computed elsewhere in this
 * codebase (`founderIntelligence`, `aiDecisionValidation`, `decision`,
 * `buyingIntent`, `competition`, `fois`, `supportingEvidence` — all
 * read-only inputs, all already attached to a `FounderOpportunityReport`
 * before this module ever runs). No LLM call, no network, no filesystem
 * writes, no re-scan of raw evidence items, no re-derivation of
 * clustering/FOIS/decision/calibration/founderIntelligence/
 * aiDecisionValidation. Every threshold below is a fixed, documented,
 * reasoned constant (no labeled founder-outcome dataset exists to
 * empirically tune against, matching every other threshold in this
 * codebase). Every returned field carries a `*Reason` string citing real,
 * already-computed values — never a fabricated fact or generic platitude.
 * Any dollar/budget figure with no real extracted-price backing is the
 * literal sentinel string "NOT VERIFIED", never an invented number.
 */

/* ========================================================================= */
/* Business model / pricing model / revenue model                           */
/* ========================================================================= */

export type RevenueModelLabel = "recurring" | "usage-based" | "one-time";

/**
 * businessModel rule table (first match wins), from
 * `founderIntelligence.founderOpportunity.bestPricingModel` +
 * `founderIntelligence.competitorIntelligence.openSourceVsSaas` — both
 * already-computed fields, never re-derived here:
 *   1. bestPricingModel === "enterprise"                              -> "Enterprise SaaS (sales-led)"
 *   2. bestPricingModel === "subscription" AND openSourceVsSaas === "open-source" -> "Open-core subscription (open-source core + paid subscription tier)"
 *   3. bestPricingModel === "subscription" (else)                     -> "SaaS subscription"
 *   4. bestPricingModel === "freemium"                                -> "Freemium SaaS (free tier + paid upgrade)"
 *   5. bestPricingModel === "usage"                                   -> "Usage-based SaaS (pay-as-you-go)"
 *   6. bestPricingModel === "one-time"                                -> "One-time-purchase software (non-recurring)"
 */
function businessModelFor(bestPricingModel: FounderPricingModel, openSourceVsSaas: OpenSourceVsSaas): { model: string; reason: string } {
  if (bestPricingModel === "enterprise") {
    return { model: "Enterprise SaaS (sales-led)", reason: `founderOpportunity.bestPricingModel="enterprise" -> sales-led enterprise SaaS.` };
  }
  if (bestPricingModel === "subscription") {
    if (openSourceVsSaas === "open-source") {
      return {
        model: "Open-core subscription (open-source core + paid subscription tier)",
        reason: `bestPricingModel="subscription" AND competitorIntelligence.openSourceVsSaas="open-source" -> open-core model.`,
      };
    }
    return { model: "SaaS subscription", reason: `bestPricingModel="subscription" (openSourceVsSaas="${openSourceVsSaas}") -> standard SaaS subscription.` };
  }
  if (bestPricingModel === "freemium") {
    return { model: "Freemium SaaS (free tier + paid upgrade)", reason: `bestPricingModel="freemium" -> freemium SaaS.` };
  }
  if (bestPricingModel === "usage") {
    return { model: "Usage-based SaaS (pay-as-you-go)", reason: `bestPricingModel="usage" -> usage-based pricing.` };
  }
  return { model: "One-time-purchase software (non-recurring)", reason: `bestPricingModel="one-time" -> one-time purchase.` };
}

/**
 * revenueModel rule table, from `bestPricingModel` alone:
 *   subscription | enterprise | freemium -> "recurring" (freemium's PAID tier is recurring; the free tier itself generates no revenue)
 *   usage                                -> "usage-based"
 *   one-time                             -> "one-time"
 */
function revenueModelFor(bestPricingModel: FounderPricingModel): { model: RevenueModelLabel; reason: string } {
  if (bestPricingModel === "usage") return { model: "usage-based", reason: `bestPricingModel="usage" -> usage-based revenue.` };
  if (bestPricingModel === "one-time") return { model: "one-time", reason: `bestPricingModel="one-time" -> one-time revenue, no recurring component evidenced.` };
  return {
    model: "recurring",
    reason: `bestPricingModel="${bestPricingModel}" -> recurring revenue${bestPricingModel === "freemium" ? " (only the paid tier converts; conversion rate itself is NOT VERIFIED)" : ""}.`,
  };
}

/* ========================================================================= */
/* B2B vs B2C                                                                */
/* ========================================================================= */

export type B2bVsB2c = "B2B" | "B2C" | "unknown";

const B2B_PHRASES = ["team", "business", "professional", "technical", "operations", "enterprise", "developers"];
const B2C_PHRASES = ["individual", "consumer", "hobbyist", "general early adopters"];

/**
 * b2bVsB2c rule table (first match wins), from
 * `competitorIntelligence.enterpriseVsSmb` + `founderOpportunity.bestCustomer`
 * (a fixed, already-computed label string, not raw evidence text):
 *   1. enterpriseVsSmb === "enterprise"                       -> "B2B"
 *   2. enterpriseVsSmb === "smb"                               -> "B2B" (SMB is still a business buyer)
 *   3. bestCustomer contains a B2B_PHRASES match               -> "B2B"
 *   4. bestCustomer contains a B2C_PHRASES match                -> "B2C"
 *   5. else                                                     -> "unknown" (no real signal either way)
 */
function b2bVsB2cFor(enterpriseVsSmb: EnterpriseVsSmb, bestCustomer: string): { value: B2bVsB2c; reason: string } {
  if (enterpriseVsSmb === "enterprise" || enterpriseVsSmb === "smb") {
    return { value: "B2B", reason: `competitorIntelligence.enterpriseVsSmb="${enterpriseVsSmb}" -> B2B (business buyer, enterprise or SMB).` };
  }
  const bestCustomerLower = bestCustomer.toLowerCase();
  const b2bMatch = B2B_PHRASES.find((phrase) => bestCustomerLower.includes(phrase));
  if (b2bMatch) {
    return { value: "B2B", reason: `founderOpportunity.bestCustomer="${bestCustomer}" contains B2B signal phrase "${b2bMatch}" -> B2B.` };
  }
  const b2cMatch = B2C_PHRASES.find((phrase) => bestCustomerLower.includes(phrase));
  if (b2cMatch) {
    return { value: "B2C", reason: `founderOpportunity.bestCustomer="${bestCustomer}" contains B2C signal phrase "${b2cMatch}" -> B2C.` };
  }
  return {
    value: "unknown",
    reason: `enterpriseVsSmb="${enterpriseVsSmb}" and bestCustomer="${bestCustomer}" contain no B2B/B2C signal phrase -> unknown (never guessed).`,
  };
}

/* ========================================================================= */
/* Company size / buyer / decision maker                                    */
/* ========================================================================= */

export type CompanySizeBand = "smb" | "enterprise" | "mixed" | "unknown";

/** Direct reuse of `enterpriseVsSmb` under a business-facing name — never re-derived. */
function companySizeFor(enterpriseVsSmb: EnterpriseVsSmb): { band: CompanySizeBand; reason: string } {
  return {
    band: enterpriseVsSmb,
    reason: `Reused verbatim from competitorIntelligence.enterpriseVsSmb="${enterpriseVsSmb}".`,
  };
}

/**
 * primaryBuyer rule table (first match wins), from `enterpriseVsSmb` +
 * `founderOpportunity.bestCustomer` (already-computed label strings — never
 * an invented named title):
 *   1. enterpriseVsSmb === "enterprise"                      -> "Enterprise buying committee (IT/Procurement-led)"
 *   2. bestCustomer contains "developer"/"technical"          -> "Individual developer or technical team lead (self-serve)"
 *   3. bestCustomer contains "operations"/"process-heavy"     -> "Team/department lead (operations)"
 *   4. bestCustomer contains "already-paying"                 -> "Existing budget holder already paying for a comparable tool"
 *   5. bestCustomer contains "switchers"                      -> "Whoever currently owns/pays for the incumbent tool being switched from"
 *   6. else                                                   -> "UNKNOWN — insufficient evidence to identify a specific buyer role"
 */
function primaryBuyerFor(enterpriseVsSmb: EnterpriseVsSmb, bestCustomer: string): { buyer: string; reason: string } {
  if (enterpriseVsSmb === "enterprise") {
    return { buyer: "Enterprise buying committee (IT/Procurement-led)", reason: `enterpriseVsSmb="enterprise" -> a committee-led purchase is typical (no specific named buyer evidenced).` };
  }
  const lower = bestCustomer.toLowerCase();
  if (lower.includes("developer") || lower.includes("technical")) {
    return { buyer: "Individual developer or technical team lead (self-serve)", reason: `bestCustomer="${bestCustomer}" -> a technical self-serve buyer.` };
  }
  if (lower.includes("operations") || lower.includes("process-heavy")) {
    return { buyer: "Team/department lead (operations)", reason: `bestCustomer="${bestCustomer}" -> an operations team lead.` };
  }
  if (lower.includes("already-paying")) {
    return { buyer: "Existing budget holder already paying for a comparable tool", reason: `bestCustomer="${bestCustomer}" -> an existing budget holder.` };
  }
  if (lower.includes("switchers")) {
    return {
      buyer: "Whoever currently owns/pays for the incumbent tool being switched from",
      reason: `bestCustomer="${bestCustomer}" -> the incumbent tool's current owner/payer.`,
    };
  }
  return { buyer: "UNKNOWN", reason: `bestCustomer="${bestCustomer}" and enterpriseVsSmb="${enterpriseVsSmb}" contain no specific buyer-role signal -> UNKNOWN, never guessed.` };
}

function decisionMakerFor(enterpriseVsSmb: EnterpriseVsSmb, primaryBuyer: string): { decisionMaker: string; reason: string } {
  if (enterpriseVsSmb === "enterprise") {
    return {
      decisionMaker: "Economic buyer within the buying committee (typically an Engineering/IT director or VP-level role for enterprise purchases)",
      reason: `enterpriseVsSmb="enterprise" -> a committee purchase typically has a distinct economic buyer from the day-to-day user; no specific title was named in evidence, so this is a typical-role description, not an asserted fact.`,
    };
  }
  return { decisionMaker: primaryBuyer, reason: `enterpriseVsSmb="${enterpriseVsSmb}" (not enterprise) -> the buyer and decision maker are the same person/role: "${primaryBuyer}".` };
}

/* ========================================================================= */
/* Budget estimate                                                          */
/* ========================================================================= */

export type BudgetConfidence = "high" | "medium" | "low" | "not-verified";

function budgetEstimateFor(
  pricingEvidence: FounderOpportunityReport["founderIntelligence"]["competitorIntelligence"]["pricingEvidence"],
  competitorConfidence: FounderOpportunityReport["founderIntelligence"]["competitorIntelligence"]["competitorConfidence"],
): { estimate: string; confidence: BudgetConfidence; reason: string } {
  if (!pricingEvidence || pricingEvidence.extractedPrices.length === 0) {
    return {
      estimate: "NOT VERIFIED",
      confidence: "not-verified",
      reason: "competitorIntelligence.pricingEvidence=null (no price point was extracted from evidence) -> no dollar figure is asserted for a budget estimate.",
    };
  }
  const priceList = pricingEvidence.extractedPrices.map((price) => `$${price}`).join(", ");
  const confidence: BudgetConfidence = competitorConfidence === "unknown" ? "low" : competitorConfidence;
  return {
    estimate: `Comparable evidence-extracted price point(s): ${priceList} (${pricingEvidence.suggestedPriceText})`,
    confidence,
    reason: `${pricingEvidence.extractedPrices.length} real price point(s) were extracted from evidence -> budget estimate cites them directly, never a fabricated number.`,
  };
}

/* ========================================================================= */
/* Urgency (from fois.dimensions' "urgency" dimension — never re-derived)   */
/* ========================================================================= */

export type UrgencyBand = "high" | "medium" | "low";

/** fois "urgency" dimension raw score (0-100) at/above this -> "high" business urgency. */
const URGENCY_HIGH_RAW_THRESHOLD = 60;
/** fois "urgency" dimension raw score (0-100) at/above this (and below HIGH) -> "medium". */
const URGENCY_MEDIUM_RAW_THRESHOLD = 30;

function urgencyFor(fois: FounderOpportunityReport["fois"]): { band: UrgencyBand; reason: string } {
  const dimension = fois.dimensions.find((d) => d.name === "urgency");
  if (!dimension) {
    return { band: "low", reason: 'fois.dimensions contains no "urgency" entry (unexpected) -> defaults to "low" rather than guessing.' };
  }
  const band: UrgencyBand =
    dimension.raw >= URGENCY_HIGH_RAW_THRESHOLD ? "high" : dimension.raw >= URGENCY_MEDIUM_RAW_THRESHOLD ? "medium" : "low";
  return {
    band,
    reason: `fois.dimensions["urgency"].raw=${dimension.raw.toFixed(0)}/100 (${dimension.reason}) -> ${band} business urgency.`,
  };
}

/* ========================================================================= */
/* Switching difficulty                                                     */
/* ========================================================================= */

export type SwitchingDifficulty = "high" | "medium" | "low" | "unknown";

/**
 * switchingDifficulty rule table (first match wins), from `report.category`
 * (the already-computed cluster category copied onto the report) +
 * `competitorIntelligence.enterpriseVsSmb`/`openSourceVsSaas`:
 *   1. category in {"looking-for-alternative", "migration"} -> "low" (evidence shows active switching behavior already happening)
 *   2. enterpriseVsSmb === "enterprise"                     -> "high" (enterprise procurement/lock-in typically harder to switch)
 *   3. openSourceVsSaas === "open-source"                   -> "medium" (self-hosted/data-migration friction, but no proprietary lock-in evidenced)
 *   4. else                                                  -> "unknown" (no direct signal)
 */
function switchingDifficultyFor(
  category: string,
  enterpriseVsSmb: EnterpriseVsSmb,
  openSourceVsSaas: OpenSourceVsSaas,
): { value: SwitchingDifficulty; reason: string } {
  if (category === "looking-for-alternative" || category === "migration") {
    return { value: "low", reason: `report.category="${category}" -> evidence shows users already actively switching -> low switching difficulty.` };
  }
  if (enterpriseVsSmb === "enterprise") {
    return { value: "high", reason: `competitorIntelligence.enterpriseVsSmb="enterprise" -> enterprise procurement/lock-in typically makes switching harder.` };
  }
  if (openSourceVsSaas === "open-source") {
    return { value: "medium", reason: `competitorIntelligence.openSourceVsSaas="open-source" -> self-hosted/data-migration friction is a real but moderate barrier.` };
  }
  return { value: "unknown", reason: `category="${category}", enterpriseVsSmb="${enterpriseVsSmb}", openSourceVsSaas="${openSourceVsSaas}" -> no direct switching-difficulty signal.` };
}

/* ========================================================================= */
/* Expansion potential (reused from aiDecisionValidation.monetization)      */
/* ========================================================================= */

function expansionPotentialFor(enterprisePotential: MonetizationSupportLabel): { value: MonetizationSupportLabel; reason: string } {
  return {
    value: enterprisePotential,
    reason: `Reused verbatim from aiDecisionValidation.monetization.enterprisePotential="${enterprisePotential}".`,
  };
}

/* ========================================================================= */
/* Result shape + entry point                                               */
/* ========================================================================= */

export interface BusinessIntelligenceResult {
  businessModel: string;
  businessModelReason: string;
  /** Reused verbatim from `founderIntelligence.founderOpportunity.bestPricingModel`. */
  pricingModel: FounderPricingModel;
  revenueModel: RevenueModelLabel;
  revenueModelReason: string;
  b2bVsB2c: B2bVsB2c;
  b2bVsB2cReason: string;
  /** Reused verbatim from `aiDecisionValidation.founderOpportunity.idealCustomerProfile`. */
  idealCustomerProfile: string;
  companySize: CompanySizeBand;
  companySizeReason: string;
  primaryBuyer: string;
  primaryBuyerReason: string;
  decisionMaker: string;
  decisionMakerReason: string;
  /** Literal "NOT VERIFIED" when no real extracted price backs it — never a fabricated dollar figure. */
  budgetEstimate: string;
  budgetConfidence: BudgetConfidence;
  budgetReason: string;
  urgency: UrgencyBand;
  urgencyReason: string;
  switchingDifficulty: SwitchingDifficulty;
  switchingDifficultyReason: string;
  /** Reused verbatim from `aiDecisionValidation.monetization.enterprisePotential`. */
  expansionPotential: MonetizationSupportLabel;
  expansionPotentialReason: string;
}

/**
 * Composes the Phase 1 Business Intelligence bundle from an
 * already-populated `FounderOpportunityReport`. Pure function — no side
 * effects, no LLM call, no re-derivation of any upstream field. Standalone
 * library (mirrors `src/founder-copilot`'s pattern): not wired into
 * engine.ts.
 */
export function composeBusinessIntelligence(report: FounderOpportunityReport): BusinessIntelligenceResult {
  const { founderIntelligence, aiDecisionValidation, fois } = report;
  const { founderOpportunity, competitorIntelligence } = founderIntelligence;
  const { bestPricingModel, bestCustomer } = founderOpportunity;
  const { enterpriseVsSmb, openSourceVsSaas, pricingEvidence, competitorConfidence } = competitorIntelligence;

  const businessModel = businessModelFor(bestPricingModel, openSourceVsSaas);
  const revenueModel = revenueModelFor(bestPricingModel);
  const b2bVsB2c = b2bVsB2cFor(enterpriseVsSmb, bestCustomer);
  const companySize = companySizeFor(enterpriseVsSmb);
  const primaryBuyer = primaryBuyerFor(enterpriseVsSmb, bestCustomer);
  const decisionMaker = decisionMakerFor(enterpriseVsSmb, primaryBuyer.buyer);
  const budget = budgetEstimateFor(pricingEvidence, competitorConfidence);
  const urgency = urgencyFor(fois);
  const switchingDifficulty = switchingDifficultyFor(report.category, enterpriseVsSmb, openSourceVsSaas);
  const expansionPotential = expansionPotentialFor(aiDecisionValidation.monetization.enterprisePotential);

  return {
    businessModel: businessModel.model,
    businessModelReason: businessModel.reason,
    pricingModel: bestPricingModel,
    revenueModel: revenueModel.model,
    revenueModelReason: revenueModel.reason,
    b2bVsB2c: b2bVsB2c.value,
    b2bVsB2cReason: b2bVsB2c.reason,
    idealCustomerProfile: aiDecisionValidation.founderOpportunity.idealCustomerProfile,
    companySize: companySize.band,
    companySizeReason: companySize.reason,
    primaryBuyer: primaryBuyer.buyer,
    primaryBuyerReason: primaryBuyer.reason,
    decisionMaker: decisionMaker.decisionMaker,
    decisionMakerReason: decisionMaker.reason,
    budgetEstimate: budget.estimate,
    budgetConfidence: budget.confidence,
    budgetReason: budget.reason,
    urgency: urgency.band,
    urgencyReason: urgency.reason,
    switchingDifficulty: switchingDifficulty.value,
    switchingDifficultyReason: switchingDifficulty.reason,
    expansionPotential: expansionPotential.value,
    expansionPotentialReason: expansionPotential.reason,
  };
}

export type { PricingConfidence };
