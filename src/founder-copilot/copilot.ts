import type { FounderCopilotAnswer, FounderCopilotCitation, FounderCopilotTopic, FounderOpportunityReport } from "./types.js";

/**
 * Founder Copilot — pure, deterministic, keyword-routed Q&A over an
 * already-computed `FounderOpportunityReport`. See types.ts's module doc for
 * the read-only/no-fabrication contract this whole module upholds.
 *
 * This module ONLY reads the report; it never re-derives clustering/FOIS/
 * decision/calibration/founderIntelligence, never calls an LLM, never makes
 * a network request, and never mutates the report it's given (every builder
 * function below only reads fields off `report` and returns new plain
 * objects/strings).
 */

/* ======================================================================= */
/* Shared helpers                                                          */
/* ======================================================================= */

function cite(fieldPath: string, value: string | number | string[]): FounderCopilotCitation {
  const stringValue = Array.isArray(value) ? value.join("; ") : String(value);
  return { fieldPath, value: stringValue };
}

/**
 * True when a cited field's own value IS one of this codebase's documented
 * "never fabricate, be honest instead" sentinels (see
 * ai-decision-validation.ts's module doc): the literal substring
 * "NOT VERIFIED" (as embedded verbatim by Module 6's `possiblePricingFor`),
 * or an exact "unknown"/"not-verified" enum value (PricingConfidence,
 * MonetizationSupportLabel, CompetitorConfidence, etc.). Never a fuzzy
 * guess — only matches a real, already-emitted sentinel value.
 */
function isSentinelUnverifiedValue(value: string): boolean {
  return value.includes("NOT VERIFIED") || value === "unknown" || value === "not-verified";
}

/**
 * Composes the final answer object for a topic builder: appends an explicit
 * "NOT VERIFIED: ..." sentence (naming the exact unverified citation(s))
 * whenever any cited field is a real sentinel-unverified value — the answer
 * never silently omits this. `forceNotVerified` lets a topic builder flag a
 * genuine unknown that isn't itself a literal sentinel string (e.g. the
 * "validation" topic's non-empty `finalRecommendation.unknowns` array, whose
 * entries are honest prose, not a single sentinel token) — see
 * `answerValidation` below for the one place this is used.
 */
function finalize(citations: FounderCopilotCitation[], answerBody: string, forceNotVerified = false): { answer: string; citations: FounderCopilotCitation[]; notVerified: boolean } {
  const unverifiedCitations = citations.filter((c) => isSentinelUnverifiedValue(c.value));
  const notVerified = forceNotVerified || unverifiedCitations.length > 0;
  const answer = notVerified
    ? unverifiedCitations.length > 0
      ? `${answerBody} NOT VERIFIED: ${unverifiedCitations.map((c) => `${c.fieldPath}="${c.value}"`).join("; ")} — no fact is asserted beyond what these fields already state.`
      : `${answerBody} NOT VERIFIED: this answer surfaces real open unknowns cited above rather than asserting a fact for them.`
    : answerBody;
  return { answer, citations, notVerified };
}

/* ======================================================================= */
/* Per-topic answer builders — every string cites a real field VALUE only  */
/* ======================================================================= */

function answerWhatToBuild(report: FounderOpportunityReport) {
  const fr = report.aiDecisionValidation.finalRecommendation;
  const fo = report.aiDecisionValidation.founderOpportunity;
  const citations = [
    cite("aiDecisionValidation.finalRecommendation.recommendedAction", fr.recommendedAction),
    cite("aiDecisionValidation.founderOpportunity.corePain", fo.corePain),
    cite("aiDecisionValidation.finalRecommendation.businessOpportunity", fr.businessOpportunity),
  ];
  const answerBody = `Recommended action: "${fr.recommendedAction}". Core pain to build for: ${fo.corePain} ${fr.businessOpportunity}`;
  return finalize(citations, answerBody);
}

function answerWhy(report: FounderOpportunityReport) {
  const dr = report.aiDecisionValidation.decisionReasoning;
  const es = report.aiDecisionValidation.finalRecommendation.evidenceSummary;
  const citations = [
    cite("aiDecisionValidation.decisionReasoning.actualBusinessProblem", dr.actualBusinessProblem),
    cite("aiDecisionValidation.decisionReasoning.whyExists", dr.whyExists),
    cite("aiDecisionValidation.finalRecommendation.evidenceSummary", es),
  ];
  const answerBody = `${dr.actualBusinessProblem} ${dr.whyExists} Evidence: ${es}`;
  return finalize(citations, answerBody);
}

function answerCustomer(report: FounderOpportunityReport) {
  const fo = report.aiDecisionValidation.founderOpportunity;
  const citations = [
    cite("aiDecisionValidation.founderOpportunity.idealCustomerProfile", fo.idealCustomerProfile),
    cite("aiDecisionValidation.founderOpportunity.earlyAdopterProfile", fo.earlyAdopterProfile),
    cite("aiDecisionValidation.founderOpportunity.whoShouldNotBeTargeted", fo.whoShouldNotBeTargeted),
  ];
  const answerBody = `Ideal customer: ${fo.idealCustomerProfile} Early adopters: ${fo.earlyAdopterProfile} Who NOT to target: ${fo.whoShouldNotBeTargeted}`;
  return finalize(citations, answerBody);
}

function answerWhyPay(report: FounderOpportunityReport) {
  const m = report.aiDecisionValidation.monetization;
  const citations = [
    cite("aiDecisionValidation.monetization.possiblePricing", m.possiblePricing),
    cite("aiDecisionValidation.monetization.pricingConfidence", m.pricingConfidence),
    cite("aiDecisionValidation.monetization.subscriptionViability", m.subscriptionViability),
    cite("aiDecisionValidation.monetization.enterprisePotential", m.enterprisePotential),
  ];
  const answerBody = `${m.possiblePricing} Subscription viability: "${m.subscriptionViability}". Enterprise potential: "${m.enterprisePotential}". Pricing confidence: "${m.pricingConfidence}".`;
  return finalize(citations, answerBody);
}

function answerRisks(report: FounderOpportunityReport) {
  const risks = report.aiDecisionValidation.risks;
  const citations: FounderCopilotCitation[] = [];
  const lines: string[] = [];
  risks.forEach((risk, index) => {
    citations.push(cite(`aiDecisionValidation.risks[${index}].risk`, risk.risk));
    citations.push(cite(`aiDecisionValidation.risks[${index}].score`, risk.score));
    citations.push(cite(`aiDecisionValidation.risks[${index}].reason`, risk.reason));
    lines.push(`${risk.risk} (${risk.score}/100): ${risk.reason}`);
  });
  const answerBody = `Risk taxonomy (${risks.length} risk(s)): ${lines.join(" | ")}`;
  return finalize(citations, answerBody);
}

function answerValidation(report: FounderOpportunityReport) {
  const fr = report.aiDecisionValidation.finalRecommendation;
  const citations = [
    cite("aiDecisionValidation.finalRecommendation.nextValidationSteps", fr.nextValidationSteps),
    cite("aiDecisionValidation.finalRecommendation.unknowns", fr.unknowns),
  ];
  const stepsText =
    fr.nextValidationSteps.length > 0
      ? `Next validation step(s): ${fr.nextValidationSteps.join(" ")}`
      : "No specific validation step was identified by the upstream engine's fixed rule set.";
  const unknownsText = fr.unknowns.length > 0 ? ` Open unknown(s) to resolve first: ${fr.unknowns.join(" ")}` : " No open unknowns were flagged.";
  const answerBody = `${stepsText}${unknownsText}`;
  // finalRecommendation.unknowns is a real, already-computed list of honest
  // gaps (see ai-decision-validation.ts's collectUnknowns) — its entries are
  // full prose sentences, not a single sentinel token, so this is the one
  // topic that forces notVerified via `forceNotVerified` rather than relying
  // on `isSentinelUnverifiedValue` alone.
  return finalize(citations, answerBody, fr.unknowns.length > 0);
}

function answerMvp(report: FounderOpportunityReport) {
  const fo = report.aiDecisionValidation.founderOpportunity;
  const citations = [
    cite("aiDecisionValidation.founderOpportunity.topMvpFeatures", fo.topMvpFeatures),
    cite("aiDecisionValidation.founderOpportunity.featuresToAvoid", fo.featuresToAvoid),
  ];
  const featuresText =
    fo.topMvpFeatures.length > 0
      ? `Suggested MVP feature(s), evidence-ranked: ${fo.topMvpFeatures.join("; ")}.`
      : "No specific MVP feature was identified from evidence-backed market gaps (founderIntelligence.marketGaps is empty for this opportunity).";
  const avoidText = fo.featuresToAvoid.length > 0 ? ` Avoid for v1 (matched build-difficulty signal(s)): ${fo.featuresToAvoid.join("; ")}.` : "";
  return finalize(citations, `${featuresText}${avoidText}`);
}

function answerLaunch(report: FounderOpportunityReport) {
  const fo = report.aiDecisionValidation.founderOpportunity;
  const fr = report.aiDecisionValidation.finalRecommendation;
  const citations = [
    cite("aiDecisionValidation.founderOpportunity.suggestedLaunchStrategy", fo.suggestedLaunchStrategy),
    cite("aiDecisionValidation.finalRecommendation.goToMarketDirection", fr.goToMarketDirection),
  ];
  return finalize(citations, fo.suggestedLaunchStrategy);
}

/* ======================================================================= */
/* Question routing — deterministic, keyword-based, first-match-wins        */
/* ======================================================================= */

/**
 * Documented routing rule table, evaluated top to bottom: the FIRST entry
 * whose `keywords` contains a substring of the lowercased question wins
 * (first-match-wins). More specific phrasings are listed before shorter,
 * more generic single-word keywords (e.g. "why" is deliberately last among
 * the "why*"-adjacent entries, so "why will they pay?" matches `why-pay`
 * rather than the generic `why` topic). This is a fixed heuristic, not NLP —
 * an unmatched question always falls through to the honest `unmatched`
 * fallback (see `answerUnmatched`), never a guessed topic.
 */
const ROUTES: Array<{ topic: FounderCopilotTopic; keywords: string[]; builder: (report: FounderOpportunityReport) => ReturnType<typeof answerWhy> }> = [
  { topic: "why-pay", keywords: ["why will they pay", "willing to pay", "pay for", "monetiz", "pricing", "charge"], builder: answerWhyPay },
  { topic: "customer", keywords: ["who is the customer", "who is my customer", "customer", "who is", "target audience", "target user", "target market"], builder: answerCustomer },
  { topic: "risks", keywords: ["risk", "danger", "threat", "go wrong"], builder: answerRisks },
  { topic: "validation", keywords: ["how should i validate", "validate", "validation", "test the idea", "proof"], builder: answerValidation },
  { topic: "mvp", keywords: ["mvp", "minimum viable", "what mvp", "first version", "v1"], builder: answerMvp },
  { topic: "launch", keywords: ["how should i launch", "launch", "go to market", "go-to-market", "gtm", "release"], builder: answerLaunch },
  { topic: "what-to-build", keywords: ["what should i build", "what to build", "what do i build", "build this"], builder: answerWhatToBuild },
  { topic: "why", keywords: ["why"], builder: answerWhy },
];

/** The 8 canonical founder questions this module always covers via `answerAllFounderQuestions`, in this exact order. */
export const CANONICAL_FOUNDER_QUESTIONS: readonly string[] = [
  "What should I build?",
  "Why?",
  "Who is the customer?",
  "Why will they pay?",
  "What are the risks?",
  "How should I validate?",
  "What MVP?",
  "How should I launch?",
];

function answerUnmatched(question: string): FounderCopilotAnswer {
  const coveredTopics = Array.from(new Set(ROUTES.map((r) => r.topic))).join(", ");
  return {
    question,
    topic: "unmatched",
    answer: `This question doesn't match any of this copilot's covered topics (${coveredTopics}). No answer was generated rather than guessing — try rephrasing to match one of: ${CANONICAL_FOUNDER_QUESTIONS.join(" / ")}`,
    citations: [],
    notVerified: true,
  };
}

/**
 * Routes `question` to the first matching topic in `ROUTES` (see its doc
 * comment for the exact first-match-wins rule) and builds an answer
 * entirely from field VALUES already present on `report`. Pure — no
 * mutation of `report`, no I/O, no LLM call.
 */
export function answerFounderQuestion(report: FounderOpportunityReport, question: string): FounderCopilotAnswer {
  const normalized = question.toLowerCase();
  const route = ROUTES.find((r) => r.keywords.some((keyword) => normalized.includes(keyword)));
  if (!route) {
    return answerUnmatched(question);
  }
  const { answer, citations, notVerified } = route.builder(report);
  return { question, topic: route.topic, answer, citations, notVerified };
}

/**
 * Answers all 8 canonical founder questions (see `CANONICAL_FOUNDER_QUESTIONS`)
 * against `report`, in the same fixed order, by delegating to
 * `answerFounderQuestion` for each.
 */
export function answerAllFounderQuestions(report: FounderOpportunityReport): FounderCopilotAnswer[] {
  return CANONICAL_FOUNDER_QUESTIONS.map((question) => answerFounderQuestion(report, question));
}
