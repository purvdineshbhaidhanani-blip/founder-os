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
 * an exact "unknown"/"not-verified" enum value (PricingConfidence,
 * MonetizationSupportLabel, CompetitorConfidence, etc.), the literal
 * substring "UNKNOWN" (as emitted by business-intelligence.ts's
 * `primaryBuyerFor`/`decisionMakerFor` and market-intelligence.ts's
 * geo/industry concentration fields — Phase 9 addition), or an exact
 * "insufficient-data"/"unclear" enum value (GrowthStageLabel,
 * OpportunityWindowLabel — market-intelligence.ts, Phase 9 addition). Never
 * a fuzzy guess — only matches a real, already-emitted sentinel value. The
 * original 3 checks are unchanged; the 3 new checks are purely additive.
 */
function isSentinelUnverifiedValue(value: string): boolean {
  return (
    value.includes("NOT VERIFIED") ||
    value === "unknown" ||
    value === "not-verified" ||
    value.includes("UNKNOWN") ||
    value === "insufficient-data" ||
    value === "unclear"
  );
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
/* Phase 9 — additive per-topic answer builders (8 new topics)             */
/*                                                                          */
/* Every builder below composes ONLY from field VALUES already present on  */
/* `report.businessIntelligence` / `report.marketIntelligence` /           */
/* `report.revenueIntelligence` / `report.mvpPlan` / `report.goToMarket` /  */
/* `report.technicalBlueprint` (the 6 Founder Business Intelligence        */
/* bundles) plus `report.founderIntelligence` / `report.aiDecisionValidation`, */
/* exactly like the original 8 builders above — no re-derivation, no LLM,  */
/* no invented fact.                                                       */
/* ======================================================================= */

function answerWhyBuild(report: FounderOpportunityReport) {
  const why = report.founderIntelligence.founderOpportunity.why;
  const bi = report.businessIntelligence;
  const businessOpportunity = report.aiDecisionValidation.finalRecommendation.businessOpportunity;
  const citations = [
    cite("founderIntelligence.founderOpportunity.why", why),
    cite("aiDecisionValidation.finalRecommendation.businessOpportunity", businessOpportunity),
    cite("businessIntelligence.businessModel", bi.businessModel),
    cite("businessIntelligence.urgency", bi.urgency),
  ];
  const whyText = why.length > 0 ? why.join(" ") : "No evidence-backed reason to build was recorded (founderIntelligence.founderOpportunity.why is empty).";
  const answerBody = `${whyText} Business opportunity: ${businessOpportunity} Business model: "${bi.businessModel}" (urgency="${bi.urgency}").`;
  return finalize(citations, answerBody);
}

function answerWhyNotBuild(report: FounderOpportunityReport) {
  const whyNot = report.founderIntelligence.founderOpportunity.whyNot;
  const risks = report.aiDecisionValidation.risks;
  const topRiskIndex = risks.length === 0 ? -1 : risks.reduce((bestIndex, risk, index) => (risk.score > risks[bestIndex]!.score ? index : bestIndex), 0);
  const topRisk = topRiskIndex >= 0 ? risks[topRiskIndex] : undefined;
  const citations = [cite("founderIntelligence.founderOpportunity.whyNot", whyNot)];
  if (topRisk) {
    citations.push(cite(`aiDecisionValidation.risks[${topRiskIndex}].risk`, topRisk.risk));
    citations.push(cite(`aiDecisionValidation.risks[${topRiskIndex}].score`, topRisk.score));
    citations.push(cite(`aiDecisionValidation.risks[${topRiskIndex}].reason`, topRisk.reason));
  }
  const whyNotText =
    whyNot.length > 0
      ? whyNot.join(" ")
      : "No evidence-backed reason against building was recorded (founderIntelligence.founderOpportunity.whyNot is empty).";
  const riskText = topRisk ? ` Biggest evidenced risk: ${topRisk.risk} (${topRisk.score}/100): ${topRisk.reason}` : " No risk was computed (unexpected — aiDecisionValidation.risks is empty).";
  return finalize(citations, `${whyNotText}${riskText}`);
}

function answerWhoPays(report: FounderOpportunityReport) {
  const bi = report.businessIntelligence;
  const citations = [
    cite("businessIntelligence.primaryBuyer", bi.primaryBuyer),
    cite("businessIntelligence.decisionMaker", bi.decisionMaker),
    cite("businessIntelligence.companySize", bi.companySize),
    cite("businessIntelligence.b2bVsB2c", bi.b2bVsB2c),
  ];
  const answerBody = `Primary buyer: ${bi.primaryBuyer} (${bi.primaryBuyerReason}) Decision maker: ${bi.decisionMaker} (${bi.decisionMakerReason}) Company size: "${bi.companySize}". Market type: ${bi.b2bVsB2c} (${bi.b2bVsB2cReason})`;
  return finalize(citations, answerBody);
}

function answerHowPrice(report: FounderOpportunityReport) {
  const ri = report.revenueIntelligence;
  const bi = report.businessIntelligence;
  const citations = [
    cite("revenueIntelligence.possiblePricing", ri.possiblePricing),
    cite("revenueIntelligence.pricingConfidence", ri.pricingConfidence),
    cite("businessIntelligence.budgetEstimate", bi.budgetEstimate),
  ];
  const answerBody = `${ri.possiblePricing} Revenue model: "${ri.revenueModel}" (${ri.revenueModelDescription}) Budget signal: ${bi.budgetEstimate} (confidence="${bi.budgetConfidence}"). Pricing confidence: "${ri.pricingConfidence}".`;
  return finalize(citations, answerBody);
}

function answerWhatBuildFirst(report: FounderOpportunityReport) {
  const mp = report.mvpPlan;
  const phase1 = mp.phasedRoadmap[0];
  const citations = [
    cite("mvpPlan.coreFeatures", mp.coreFeatures),
    cite("mvpPlan.scopeSummary", mp.scopeSummary),
    cite("mvpPlan.launchReadinessCriteria", mp.launchReadinessCriteria),
  ];
  const featuresText = mp.coreFeatures.length > 0 ? mp.coreFeatures.join("; ") : "no core feature evidenced";
  const answerBody = `${mp.scopeSummary} Build first (${phase1 ? phase1.phase : "Phase 1"}): ${featuresText}. Launch readiness: ${mp.launchReadinessCriteria.join(" ")}`;
  return finalize(citations, answerBody);
}

function answerDifferentiate(report: FounderOpportunityReport) {
  const strategies = report.founderIntelligence.differentiationStrategies;
  const tb = report.technicalBlueprint;
  const citations: FounderCopilotCitation[] = [];
  strategies.forEach((strategy, index) => {
    citations.push(cite(`founderIntelligence.differentiationStrategies[${index}].strategy`, strategy.strategy));
    citations.push(cite(`founderIntelligence.differentiationStrategies[${index}].evidenceReason`, strategy.evidenceReason));
  });
  citations.push(cite("technicalBlueprint.aiLayerAdvice", tb.aiLayerAdvice));
  const strategyText =
    strategies.length > 0
      ? `Differentiate via: ${strategies.map((s) => `"${s.strategy}" (${s.evidenceReason})`).join(" ")}`
      : "No evidence-backed differentiation strategy exists (founderIntelligence.differentiationStrategies is empty) — no positioning angle is asserted rather than inventing one.";
  const answerBody = `${strategyText} Technical differentiation angle: ${tb.aiLayerAdvice}`;
  return finalize(citations, answerBody);
}

function answerGetCustomers(report: FounderOpportunityReport) {
  const gtm = report.goToMarket;
  const citations = [
    // Indexed per-channel citations (not a full-array cite of
    // `goToMarket.recommendedChannels`, which is an array of {channel,
    // reason} objects, not strings) — each fieldPath below resolves to the
    // exact real string cited, matching this module's "citation value must
    // literally equal the resolved field" contract.
    ...gtm.recommendedChannels.map((channel, index) => cite(`goToMarket.recommendedChannels[${index}].channel`, channel.channel)),
    cite("goToMarket.positioningStatement", gtm.positioningStatement),
    cite("goToMarket.earlyAdopterProfile", gtm.earlyAdopterProfile),
  ];
  const channelsText = gtm.recommendedChannels.length > 0 ? gtm.recommendedChannels.map((c) => c.channel).join("; ") : "no channel recommendation was composed";
  const answerBody = `Recommended channel(s): ${channelsText}. ${gtm.positioningStatement} Early adopters: ${gtm.earlyAdopterProfile}`;
  return finalize(citations, answerBody);
}

function answerMarketWeak(report: FounderOpportunityReport) {
  const mi = report.marketIntelligence;
  const gaps = report.founderIntelligence.marketGaps;
  const citations = [
    cite("marketIntelligence.saturation", mi.saturation),
    cite("marketIntelligence.opportunityWindow", mi.opportunityWindow),
    cite("marketIntelligence.growthStage", mi.growthStage),
    cite("marketIntelligence.competitionPressure", mi.competitionPressure),
    ...gaps.map((gap, index) => cite(`founderIntelligence.marketGaps[${index}].gap`, gap.gap)),
  ];
  const gapsText =
    gaps.length > 0
      ? gaps.map((gap) => `${gap.gap} (${gap.evidenceCount} evidence item(s), confidence=${gap.confidence})`).join("; ")
      : "no evidence-backed gap was detected (founderIntelligence.marketGaps is empty)";
  const answerBody = `Saturation: "${mi.saturation}" (opportunityWindow="${mi.opportunityWindow}", growthStage="${mi.growthStage}", competitionPressure="${mi.competitionPressure}"). Evidenced weak spot(s): ${gapsText}.`;
  return finalize(citations, answerBody);
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
 *
 * PHASE 9: the 8 new, more-specific entries are placed FIRST (above all 8
 * original entries), for two proven reasons (see
 * tests/founder-copilot/copilot.test.ts's routing-regression suite):
 *   1. `why-not-build`/`why-build` must be checked before `what-to-build`
 *      (whose keyword "build this" is a substring of "Why build this?" /
 *      "Why NOT build this?") and before the generic `why`.
 *   2. `what-build-first` must be checked before `what-to-build` (whose
 *      keyword "what should i build" is a substring of
 *      "What should I build first?").
 *   3. `get-customers` must be checked before `customer` (whose keyword
 *      "customer" is a substring of "How do I get customers?").
 *   `who-pays`/`how-price`/`differentiate`/`market-weak` have no keyword
 *   overlap with any existing entry either way, but are kept alongside the
 *   other 4 new entries at the top for a single, easy-to-audit block.
 * None of the 8 new entries' keywords are a substring of any of the 8
 * original `CANONICAL_FOUNDER_QUESTIONS` (verified in the routing-regression
 * test below), so every original question still resolves to its original
 * topic byte-for-byte despite the new entries now being checked first.
 */
const ROUTES: Array<{ topic: FounderCopilotTopic; keywords: string[]; builder: (report: FounderOpportunityReport) => ReturnType<typeof answerWhy> }> = [
  // --- Phase 9 additive entries (checked first; see doc comment above) ---
  { topic: "why-not-build", keywords: ["why not build", "why shouldn't i build", "why should i not build", "why not"], builder: answerWhyNotBuild },
  { topic: "why-build", keywords: ["why build", "why should i build"], builder: answerWhyBuild },
  { topic: "who-pays", keywords: ["who pays", "who is paying", "who will pay"], builder: answerWhoPays },
  { topic: "how-price", keywords: ["how should i price", "how do i price", "how to price", "price it"], builder: answerHowPrice },
  { topic: "what-build-first", keywords: ["what should i build first", "what to build first", "build first"], builder: answerWhatBuildFirst },
  { topic: "differentiate", keywords: ["differentiat"], builder: answerDifferentiate },
  { topic: "get-customers", keywords: ["get customers", "how do i get customers", "acquire customers", "find customers"], builder: answerGetCustomers },
  { topic: "market-weak", keywords: ["market weak", "where is the market weak", "weak market", "market gap"], builder: answerMarketWeak },
  // --- Original 8 entries, in their original relative order (unchanged) ---
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

/**
 * Phase 9 additive expansion. The mission's 10 requested questions minus the
 * 2 that are EXACT duplicates of existing `CANONICAL_FOUNDER_QUESTIONS`
 * entries ("What MVP?" -> `mvp`, "What are the biggest risks?" -> `risks`,
 * both already covered by `answerAllFounderQuestions`) — see this file's
 * module doc / types.ts's `FounderCopilotTopic` doc comment for why those 2
 * were not given new topics. `CANONICAL_FOUNDER_QUESTIONS` itself is left
 * completely untouched by this addition.
 */
export const ADDITIONAL_FOUNDER_QUESTIONS: readonly string[] = [
  "Why build this?",
  "Why NOT build this?",
  "Who pays for this?",
  "How should I price it?",
  "What should I build first?",
  "How do I differentiate?",
  "How do I get customers?",
  "Where is the market weak?",
];

/**
 * Answers all 8 `ADDITIONAL_FOUNDER_QUESTIONS`, in the same fixed order, by
 * delegating to `answerFounderQuestion` for each — mirrors
 * `answerAllFounderQuestions` exactly, just over the additive question set.
 */
export function answerAdditionalFounderQuestions(report: FounderOpportunityReport): FounderCopilotAnswer[] {
  return ADDITIONAL_FOUNDER_QUESTIONS.map((question) => answerFounderQuestion(report, question));
}
