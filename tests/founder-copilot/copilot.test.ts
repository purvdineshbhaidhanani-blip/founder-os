import { describe, expect, it } from "vitest";
import { CANONICAL_FOUNDER_QUESTIONS, answerAllFounderQuestions, answerFounderQuestion } from "../../src/founder-copilot/copilot.js";
import { defaultAiDecisionValidation } from "../../src/opportunities/ai-decision-validation.js";
import type {
  AiDecisionValidation,
  FounderDecision,
  FounderIntelligence,
  FounderOpportunityReport,
  OpportunityCalibration,
} from "../../src/opportunities/types.js";

/* -------------------------------------------------------------------- */
/* Minimal, hand-built fixture — mirrors ai-decision-validation.test.ts's */
/* "minimal hand-built fixture" pattern for direct, deterministic         */
/* control over every field this read-only module can cite.              */
/* -------------------------------------------------------------------- */

function makeDecision(overrides: Partial<FounderDecision> = {}): FounderDecision {
  return {
    intentDistribution: [{ intent: "Founder Pain", count: 3, fraction: 0.6 }],
    evidence: {
      evidenceCount: 5,
      uniqueSources: 2,
      uniqueAuthors: 3,
      freshness: "fresh",
      crossSourceAgreement: 1,
      echoChamber: false,
      explanation: "x",
    },
    reasoning: {
      whyThisMatters: "x",
      whyNow: "x",
      whoExperiences: "x",
      whatEvidence: "x",
      whyFoundersPay: "x",
      biggestUncertainty: "x",
      biggestImplementationRisk: "x",
    },
    confidence: { score: 80, band: "high", contributors: [], weaknesses: [] },
    recommendation: { verdict: "BUILD", justification: "x", primaryRisk: "x", primaryOpportunity: "x" },
    qualityGates: [],
    ...overrides,
  };
}

function makeCalibration(overrides: Partial<OpportunityCalibration> = {}): OpportunityCalibration {
  return {
    metrics: {
      rankingStability: 0.5,
      signalDensity: 0.5,
      evidenceDensity: 2.5,
      crossSourceConsistency: 0.5,
      intentConsistency: 0.6,
      noiseRatio: 0,
      duplicateCompressionRatio: 0,
    },
    diagnostics: [],
    ranking: { rankBefore: 1, rankAfter: 1, movement: 0, reason: "x" },
    explainability: null,
    falsePositive: { likely: false, reasons: [] },
    ...overrides,
  };
}

function makeFounderIntelligence(overrides: Partial<FounderIntelligence> = {}): FounderIntelligence {
  return {
    competitorIntelligence: {
      primaryCompetitors: [],
      competitorCategory: "no established competitors identified in evidence",
      marketMaturity: "emerging",
      openSourceVsSaas: "unknown",
      enterpriseVsSmb: "unknown",
      soloFounderFriendlyCompetitors: [],
      pricingEvidence: null,
      competitorConfidence: "unknown",
      competitorEvidence: [],
      explanation: "x",
    },
    marketGaps: [],
    marketMaturity: { maturity: "emerging", reasons: ["x"] },
    founderOpportunity: {
      shouldBuild: true,
      why: ["x"],
      whyNot: [],
      bestCustomer: "developers/technical users",
      whyThisCustomer: "x",
      bestPricingModel: "subscription",
      expectedBuildDifficulty: "low",
      expectedMvpComplexity: "low",
      soloFounderSuitability: "high",
    },
    competitionPressure: { pressure: "low", explanation: "x" },
    differentiationStrategies: [],
    risks: [
      { risk: "Market Risk", severity: "low", explanation: "x" },
      { risk: "Execution Risk", severity: "low", explanation: "x" },
      { risk: "Technical Risk", severity: "low", explanation: "x" },
      { risk: "Pricing Risk", severity: "low", explanation: "x" },
      { risk: "Competition Risk", severity: "low", explanation: "x" },
      { risk: "Customer Risk", severity: "low", explanation: "x" },
      { risk: "Platform Risk", severity: "low", explanation: "x" },
      { risk: "Regulation Risk", severity: "low", explanation: "x" },
    ],
    ...overrides,
  };
}

/**
 * Real (non-placeholder), fully populated `AiDecisionValidation` fixture —
 * every field a copilot answer could plausibly cite is given a distinct,
 * greppable value so tests can assert exact citation traceability.
 */
function makeAiDecisionValidation(overrides: Partial<AiDecisionValidation> = {}): AiDecisionValidation {
  const base = defaultAiDecisionValidation();
  return {
    ...base,
    decisionReasoning: {
      actualBusinessProblem: "Users can't export their data (root cause: \"Missing Integration\").",
      whyExists: "Business cause: Users churn. Technical cause: No API.",
      whyCurrentSolutionsFailing: "Evidence-backed gap(s): Missing API (4 evidence item(s), confidence=high).",
      evidenceSupporting: ["5 piece(s) of evidence were found."],
      evidenceWeakening: [],
      painTemporaryOrRecurring: "recurring",
    },
    counterEvidence: [],
    validation: { validatedRecommendation: "BUILD", validationReason: "No override: 0/5 counter-evidence claims fired.", confidenceAdjustment: 0 },
    risks: [
      { risk: "Market Risk", score: 20, reason: "marketMaturity=\"emerging\" -> low market risk.", supportingEvidence: [] },
      { risk: "Competition Risk", score: 20, reason: "competitionPressure=\"low\" -> low competition risk.", supportingEvidence: [] },
      { risk: "Execution Risk", score: 20, reason: "buildDifficulty.tier=\"low\" -> low execution risk.", supportingEvidence: [] },
      { risk: "Technical Risk", score: 20, reason: "0 build-difficulty signal(s) matched.", supportingEvidence: [] },
      { risk: "Distribution Risk", score: 55, reason: "uniqueSources=2 -> medium distribution risk.", supportingEvidence: [] },
      { risk: "Monetization Risk", score: 85, reason: "pricingEvidence=null -> high monetization risk.", supportingEvidence: [] },
      { risk: "Timing Risk", score: 20, reason: "painTemporaryOrRecurring=\"recurring\" -> low timing risk.", supportingEvidence: [] },
      { risk: "Platform Risk", score: 20, reason: "x", supportingEvidence: [] },
    ],
    founderOpportunity: {
      idealCustomerProfile: "developers/technical users — Dominant evidence source is github.",
      whoShouldNotBeTargeted: "Enterprise buyers requiring SSO/compliance/procurement.",
      earlyAdopterProfile: "technical early adopters already filing issues (dominant source \"github\" accounts for 60% of evidence).",
      corePain: "Users can't export their data.",
      topMvpFeatures: ["Missing API (4 evidence item(s), confidence=high)"],
      featuresToAvoid: [],
      suggestedLaunchStrategy: "Direct launch, early-adopter community-first — marketMaturity=\"emerging\" and soloFounderSuitability=\"high\".",
    },
    monetization: {
      possiblePricing: "Suggested model: \"subscription\". Comparable evidence-extracted price point(s): $29, $99 (Prices found: 29, 99.).",
      pricingConfidence: "medium",
      pricingAssumptions: ["Assumes the \"subscription\" model generalizes across the evidenced ICP."],
      subscriptionViability: "supported",
      enterprisePotential: "not-verified",
    },
    reviewedConfidence: { originalScore: 80, adjustedScore: 0.8, adjustment: 0, verdict: "justified", reason: "x" },
    explainability: {
      whyBuild: "x",
      whyWait: "x",
      whyIgnore: "x",
      evidenceThatMattersMost: "x",
      evidenceMissing: "x",
      whatCouldChangeThis: "x",
    },
    finalRecommendation: {
      executiveSummary: "Category \"complaint\": fois.overall=70/100. validatedRecommendation=\"BUILD\" (5 evidence item(s)); no counter-evidence claim fired.",
      recommendedAction: "BUILD",
      evidenceSummary: "5 evidence item(s) across 2 unique source(s) and 3 unique author(s); freshness=\"fresh\".",
      businessOpportunity: "Users can't export their data (root cause: \"Missing Integration\").",
      risks: [],
      recommendedMvp: ["Missing API (4 evidence item(s), confidence=high)"],
      suggestedPricingDirection: "Suggested model: \"subscription\". Comparable evidence-extracted price point(s): $29, $99 (Prices found: 29, 99.).",
      goToMarketDirection: "Direct launch, early-adopter community-first — marketMaturity=\"emerging\" and soloFounderSuitability=\"high\".",
      unknowns: [],
      nextValidationSteps: ["No specific validation gap was identified by this engine's fixed rule set; proceed per decision.recommendation.justification."],
    },
    ...overrides,
  };
}

function makeReport(aiDecisionValidationOverrides: Partial<AiDecisionValidation> = {}, reportOverrides: Partial<FounderOpportunityReport> = {}): FounderOpportunityReport {
  return {
    id: "opp_1",
    clusterId: "cluster_1",
    category: "complaint",
    problem: "Users can't export their data.",
    summary: "s",
    painScore: 0.5,
    buyingIntent: { score: 0.4, matchingItemCount: 2, totalItemCount: 5, explanation: "x" },
    competition: { competitors: [], competitionScore: 1, explanation: "x" },
    confidence: { band: "medium", score: 0.5 },
    scoreBreakdown: {
      painFrequency: 0.5,
      sourceDiversity: 0.5,
      authorDiversity: 0.5,
      buyingIntent: 0.5,
      engagement: 0.5,
      growth: 0.5,
      competition: 0.5,
      confidence: 0.5,
      weightedTotal: 0.5,
      explanation: "x",
    },
    fois: { overall: 70, dimensions: [], reasons: ["x"], weaknesses: [], penalties: [] },
    supportingEvidence: { evidenceCount: 5, sourceBreakdown: {}, urls: [] },
    representativeQuotes: [],
    recommendedMvp: "x",
    suggestedPricing: { extractedPrices: [], suggestedPriceText: "x" },
    targetUsers: "x",
    buildDifficulty: { tier: "low", matchedSignals: [], explanation: "heuristic estimate, not an engineering estimate" },
    estimatedTimeToMvp: "x",
    recommendation: { verdict: "WAIT", whyBuild: [], whyNotBuild: [], risk: [], explanation: "x" },
    createdAt: "2026-01-01T00:00:00.000Z",
    sourceSessionId: "session_1",
    sourceProblemReportId: "report_1",
    decision: makeDecision(),
    semanticCluster: { canonicalTitle: "x", aliases: [], mentionCount: 5, supportingSources: [], mergedCount: 1 },
    calibration: makeCalibration(),
    founderIntelligence: makeFounderIntelligence(),
    aiDecisionValidation: makeAiDecisionValidation(aiDecisionValidationOverrides),
    ...reportOverrides,
  };
}

/* -------------------------------------------------------------------- */
/* answerFounderQuestion — routing + citation + no-fabrication contract  */
/* -------------------------------------------------------------------- */

describe("answerFounderQuestion — routing", () => {
  it("routes 'What should I build?' to what-to-build and cites real fields", () => {
    const report = makeReport();
    const result = answerFounderQuestion(report, "What should I build?");
    expect(result.topic).toBe("what-to-build");
    expect(result.answer).toContain("BUILD");
    expect(result.answer).toContain("Users can't export their data.");
    expect(result.citations.some((c) => c.fieldPath === "aiDecisionValidation.finalRecommendation.recommendedAction" && c.value === "BUILD")).toBe(true);
    expect(result.notVerified).toBe(false);
  });

  it("routes 'Why?' to the why topic and cites decisionReasoning fields", () => {
    const report = makeReport();
    const result = answerFounderQuestion(report, "Why?");
    expect(result.topic).toBe("why");
    expect(result.answer).toContain("Missing Integration");
    expect(result.citations.some((c) => c.fieldPath === "aiDecisionValidation.decisionReasoning.actualBusinessProblem")).toBe(true);
  });

  it("routes 'Who is the customer?' to customer, not the generic why topic", () => {
    const report = makeReport();
    const result = answerFounderQuestion(report, "Who is the customer?");
    expect(result.topic).toBe("customer");
    expect(result.answer).toContain("developers/technical users");
    expect(result.answer).toContain("Enterprise buyers requiring SSO/compliance/procurement.");
  });

  it("routes 'Why will they pay?' to why-pay, not the generic why topic", () => {
    const report = makeReport();
    const result = answerFounderQuestion(report, "Why will they pay?");
    expect(result.topic).toBe("why-pay");
    expect(result.answer).toContain("$29");
    expect(result.answer).toContain("$99");
    expect(result.answer).toContain("subscription");
  });

  it("routes 'What are the risks?' to risks and cites all 8 risks by name/score/reason", () => {
    const report = makeReport();
    const result = answerFounderQuestion(report, "What are the risks?");
    expect(result.topic).toBe("risks");
    expect(result.citations.filter((c) => c.fieldPath.startsWith("aiDecisionValidation.risks["))).toHaveLength(24); // 8 risks x 3 fields each
    expect(result.answer).toContain("Monetization Risk (85/100)");
  });

  it("routes 'How should I validate?' to validation", () => {
    const report = makeReport();
    const result = answerFounderQuestion(report, "How should I validate?");
    expect(result.topic).toBe("validation");
    expect(result.answer).toContain("No specific validation gap was identified");
  });

  it("routes 'What MVP?' to mvp and cites topMvpFeatures", () => {
    const report = makeReport();
    const result = answerFounderQuestion(report, "What MVP?");
    expect(result.topic).toBe("mvp");
    expect(result.answer).toContain("Missing API");
  });

  it("routes 'How should I launch?' to launch and cites suggestedLaunchStrategy", () => {
    const report = makeReport();
    const result = answerFounderQuestion(report, "How should I launch?");
    expect(result.topic).toBe("launch");
    expect(result.answer).toContain("Direct launch, early-adopter community-first");
  });

  it("an unmatched question returns the honest fallback, never a guessed topic, with no citations and notVerified=true", () => {
    const report = makeReport();
    const result = answerFounderQuestion(report, "What's the weather today?");
    expect(result.topic).toBe("unmatched");
    expect(result.citations).toEqual([]);
    expect(result.notVerified).toBe(true);
    expect(result.answer).toContain("doesn't match any of this copilot's covered topics");
  });
});

/* -------------------------------------------------------------------- */
/* Never-fabricate contract                                              */
/* -------------------------------------------------------------------- */

describe("answerFounderQuestion — never fabricates a fact", () => {
  it("flags notVerified=true and names the exact unverified field when pricingConfidence is not-verified / possiblePricing is NOT VERIFIED", () => {
    const report = makeReport({
      monetization: {
        possiblePricing: 'Suggested model: "subscription". NOT VERIFIED — no comparable pricing evidence collected (no price point was found in evidence); no dollar figure is asserted for this opportunity.',
        pricingConfidence: "not-verified",
        pricingAssumptions: [],
        subscriptionViability: "not-verified",
        enterprisePotential: "not-verified",
      },
    });
    const result = answerFounderQuestion(report, "Why will they pay?");
    expect(result.notVerified).toBe(true);
    expect(result.answer).toContain("NOT VERIFIED");
    expect(result.answer).toContain("aiDecisionValidation.monetization.pricingConfidence");
    // No dollar figure is asserted anywhere in the answer.
    expect(result.answer).not.toMatch(/\$\d/);
  });

  it("the 'validation' topic flags notVerified=true and surfaces real unknowns verbatim when finalRecommendation.unknowns is non-empty", () => {
    const report = makeReport({
      finalRecommendation: {
        ...makeAiDecisionValidation().finalRecommendation,
        unknowns: ['pricingConfidence="not-verified": no comparable pricing evidence.'],
        nextValidationSteps: ["Run pricing survey / competitor price research."],
      },
    });
    const result = answerFounderQuestion(report, "How should I validate?");
    expect(result.topic).toBe("validation");
    expect(result.notVerified).toBe(true);
    expect(result.answer).toContain('pricingConfidence="not-verified"');
    expect(result.citations.some((c) => c.fieldPath === "aiDecisionValidation.finalRecommendation.unknowns")).toBe(true);
  });

  /**
   * Resolves a citation's `fieldPath` (e.g. "aiDecisionValidation.risks[0].score")
   * against the real `report`, stringifying it EXACTLY the way copilot.ts's
   * `cite` helper does (arrays joined with "; ", everything else via
   * `String(...)`). This proves each citation's `value` is a byte-for-byte
   * copy of the real field's value — never a fabricated or reworded string —
   * without the ambiguity of trying to split a joined value back apart (some
   * scalar prose fields legitimately contain their own "; ", e.g.
   * evidenceSummary's "...; freshness=...").
   */
  function resolveFieldPath(report: FounderOpportunityReport, fieldPath: string): string {
    const segments = fieldPath.split(".").flatMap((segment) => {
      const match = segment.match(/^(\w+)\[(\d+)\]$/);
      return match ? [match[1]!, match[2]!] : [segment];
    });
    let current: unknown = report;
    for (const segment of segments) {
      expect(current, `fieldPath "${fieldPath}" resolves to undefined at segment "${segment}"`).not.toBeUndefined();
      current = (current as Record<string, unknown>)[segment];
    }
    return Array.isArray(current) ? current.join("; ") : String(current);
  }

  it("every citation's fieldPath/value pair traces back to a real field already present on the report — no invented content", () => {
    const report = makeReport();
    const answers = answerAllFounderQuestions(report);
    for (const answer of answers) {
      for (const citation of answer.citations) {
        expect(citation.value).toBe(resolveFieldPath(report, citation.fieldPath));
      }
    }
  });
});

/* -------------------------------------------------------------------- */
/* answerAllFounderQuestions                                             */
/* -------------------------------------------------------------------- */

describe("answerAllFounderQuestions", () => {
  it("returns exactly the 8 canonical questions, in order, each with a distinct real topic", () => {
    const report = makeReport();
    const answers = answerAllFounderQuestions(report);
    expect(answers).toHaveLength(8);
    expect(answers.map((a) => a.question)).toEqual([...CANONICAL_FOUNDER_QUESTIONS]);
    expect(answers.map((a) => a.topic)).toEqual([
      "what-to-build",
      "why",
      "customer",
      "why-pay",
      "risks",
      "validation",
      "mvp",
      "launch",
    ]);
    for (const answer of answers) {
      expect(answer.answer.length).toBeGreaterThan(0);
    }
  });

  it("is pure — never mutates the input report", () => {
    const report = makeReport();
    const before = JSON.stringify(report);
    answerAllFounderQuestions(report);
    const after = JSON.stringify(report);
    expect(after).toBe(before);
  });
});
