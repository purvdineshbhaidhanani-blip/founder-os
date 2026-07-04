import { describe, expect, it } from "vitest";
import {
  ADDITIONAL_FOUNDER_QUESTIONS,
  CANONICAL_FOUNDER_QUESTIONS,
  answerAdditionalFounderQuestions,
  answerAllFounderQuestions,
  answerFounderQuestion,
} from "../../src/founder-copilot/copilot.js";
import { defaultAiDecisionValidation } from "../../src/opportunities/ai-decision-validation.js";
import {
  attachFounderBusinessIntelligence,
  defaultBusinessIntelligence,
  defaultGoToMarket,
  defaultMarketIntelligence,
  defaultMvpPlan,
  defaultRevenueIntelligence,
  defaultTechnicalBlueprint,
} from "../../src/opportunities/founder-business-intelligence.js";
import { attachKnowledgeLinks, defaultKnowledgeLinks } from "../../src/opportunities/knowledge-links.js";
import type {
  AiDecisionValidation,
  FounderDecision,
  FounderIntelligence,
  FounderOpportunityReport,
  OpportunityCalibration,
} from "../../src/opportunities/types.js";
import type { ProblemCluster } from "../../src/problems/types.js";

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

/**
 * Minimal `ProblemCluster` fixture backing `makeReport`'s
 * `composeMarketIntelligence(report, cluster)` call (the one Phase 9 bundle
 * builder that needs the source cluster, for `frequency.growth.label`) — see
 * `attachFounderBusinessIntelligence`'s doc for why every other bundle only
 * needs the report itself.
 */
function makeCluster(overrides: Partial<ProblemCluster> = {}): ProblemCluster {
  return {
    id: "cluster_1",
    category: "complaint",
    normalizedStatement: "Users can't export their data.",
    evidence: { evidenceCount: 5, sourceBreakdown: { github: 3, reddit: 2 }, originalUrls: [], representativeExamples: [], engagementTotal: 10, dateRange: null },
    frequency: { mentions: 5, uniqueAuthors: 3, uniqueSources: 2, engagementTotal: 10, growth: { label: "rising", recentHalfCount: 4, earlierHalfCount: 1, ratio: 4 } },
    confidence: { band: "medium", score: 0.5, explanation: "x" },
    createdAt: "2026-01-01T00:00:00.000Z",
    sourceSessionId: "session_1",
    ...overrides,
  };
}

/**
 * Builds a full, internally-consistent `FounderOpportunityReport` — same
 * hand-built pattern as before for every pre-Phase-9 field, PLUS the 6
 * Founder Business Intelligence bundles (`businessIntelligence` ..
 * `technicalBlueprint`) and `knowledgeLinks`, computed via the REAL,
 * already-shipped `attachFounderBusinessIntelligence`/`attachKnowledgeLinks`
 * pipeline functions (imported read-only, never modified) — exactly mirrors
 * founder-business-os.test.ts's "reuse the real composition functions, never
 * hand-fake" philosophy, so every Phase 9 builder under test cites values
 * that are exactly what the real upstream modules would produce.
 */
function makeReport(
  aiDecisionValidationOverrides: Partial<AiDecisionValidation> = {},
  reportOverrides: Partial<FounderOpportunityReport> = {},
  clusterOverrides: Partial<ProblemCluster> = {},
): FounderOpportunityReport {
  const rawReport: FounderOpportunityReport = {
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
    supportingEvidence: { evidenceCount: 5, sourceBreakdown: { github: 3, reddit: 2 }, urls: [] },
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
    // Trivial placeholders — overwritten below by the real
    // attachFounderBusinessIntelligence/attachKnowledgeLinks pipeline calls,
    // exactly mirroring engine.ts's own construct-then-attach pattern.
    businessIntelligence: defaultBusinessIntelligence(),
    marketIntelligence: defaultMarketIntelligence(),
    revenueIntelligence: defaultRevenueIntelligence(),
    mvpPlan: defaultMvpPlan(),
    goToMarket: defaultGoToMarket(),
    technicalBlueprint: defaultTechnicalBlueprint(),
    knowledgeLinks: defaultKnowledgeLinks(),
    ...reportOverrides,
  };

  const cluster = makeCluster({ id: rawReport.clusterId, category: rawReport.category as ProblemCluster["category"], normalizedStatement: rawReport.problem, ...clusterOverrides });

  const [withBundles] = attachFounderBusinessIntelligence([rawReport], [cluster]);
  const [withLinks] = attachKnowledgeLinks([withBundles!]);
  return withLinks!;
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

/* ======================================================================= */
/* Phase 9 — additive 8-topic expansion                                    */
/* ======================================================================= */

/**
 * Resolves a citation's `fieldPath` against the real `report`, exactly like
 * the "never fabricates a fact" describe block's own `resolveFieldPath`
 * above (kept as a separate, module-level helper here so the Phase 9 suite
 * doesn't reach into that describe block's local scope).
 */
function resolveReportFieldPath(report: FounderOpportunityReport, fieldPath: string): string {
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

describe("Phase 9 — routing regression: all 8 original questions still route identically", () => {
  const expectedOriginalTopics: Record<string, string> = {
    "What should I build?": "what-to-build",
    "Why?": "why",
    "Who is the customer?": "customer",
    "Why will they pay?": "why-pay",
    "What are the risks?": "risks",
    "How should I validate?": "validation",
    "What MVP?": "mvp",
    "How should I launch?": "launch",
  };

  it.each(Object.entries(expectedOriginalTopics))("%s -> %s (unchanged by the 8 new Phase 9 ROUTES entries)", (question, expectedTopic) => {
    const report = makeReport();
    const result = answerFounderQuestion(report, question);
    expect(result.topic).toBe(expectedTopic);
  });

  it("none of the 8 canonical questions is shadowed into a new Phase 9 topic", () => {
    const report = makeReport();
    const newTopics = new Set(["why-build", "why-not-build", "who-pays", "how-price", "what-build-first", "differentiate", "get-customers", "market-weak"]);
    for (const question of CANONICAL_FOUNDER_QUESTIONS) {
      const result = answerFounderQuestion(report, question);
      expect(newTopics.has(result.topic)).toBe(false);
    }
  });
});

describe("Phase 9 — the 8 new questions route correctly and are not shadowed", () => {
  const expectedNewTopics: Record<string, string> = {
    "Why build this?": "why-build",
    "Why NOT build this?": "why-not-build",
    "Who pays for this?": "who-pays",
    "How should I price it?": "how-price",
    "What should I build first?": "what-build-first",
    "How do I differentiate?": "differentiate",
    "How do I get customers?": "get-customers",
    "Where is the market weak?": "market-weak",
  };

  it.each(Object.entries(expectedNewTopics))("%s -> %s", (question, expectedTopic) => {
    const report = makeReport();
    const result = answerFounderQuestion(report, question);
    expect(result.topic).toBe(expectedTopic);
  });

  it("'Why build this?' is not shadowed by the pre-existing what-to-build 'build this' keyword", () => {
    const report = makeReport();
    expect(answerFounderQuestion(report, "Why build this?").topic).toBe("why-build");
  });

  it("'Why NOT build this?' is not shadowed by what-to-build or why-build", () => {
    const report = makeReport();
    expect(answerFounderQuestion(report, "Why NOT build this?").topic).toBe("why-not-build");
  });

  it("'What should I build first?' is not shadowed by the pre-existing what-to-build 'what should i build' keyword", () => {
    const report = makeReport();
    expect(answerFounderQuestion(report, "What should I build first?").topic).toBe("what-build-first");
  });

  it("'How do I get customers?' is not shadowed by the pre-existing customer 'customer' keyword", () => {
    const report = makeReport();
    expect(answerFounderQuestion(report, "How do I get customers?").topic).toBe("get-customers");
  });
});

describe("Phase 9 — ADDITIONAL_FOUNDER_QUESTIONS / answerAdditionalFounderQuestions", () => {
  it("has exactly 8 entries (10 requested minus the 2 exact duplicates of mvp/risks)", () => {
    expect(ADDITIONAL_FOUNDER_QUESTIONS).toHaveLength(8);
  });

  it("returns exactly the 8 additional questions, in order, each with a distinct new topic", () => {
    const report = makeReport();
    const answers = answerAdditionalFounderQuestions(report);
    expect(answers).toHaveLength(8);
    expect(answers.map((a) => a.question)).toEqual([...ADDITIONAL_FOUNDER_QUESTIONS]);
    expect(answers.map((a) => a.topic)).toEqual([
      "why-build",
      "why-not-build",
      "who-pays",
      "how-price",
      "what-build-first",
      "differentiate",
      "get-customers",
      "market-weak",
    ]);
    for (const answer of answers) {
      expect(answer.answer.length).toBeGreaterThan(0);
    }
  });

  it("does not mutate CANONICAL_FOUNDER_QUESTIONS or overlap with it", () => {
    expect(CANONICAL_FOUNDER_QUESTIONS).toHaveLength(8);
    for (const q of ADDITIONAL_FOUNDER_QUESTIONS) {
      expect(CANONICAL_FOUNDER_QUESTIONS.includes(q)).toBe(false);
    }
  });

  it("is pure — never mutates the input report", () => {
    const report = makeReport();
    const before = JSON.stringify(report);
    answerAdditionalFounderQuestions(report);
    expect(JSON.stringify(report)).toBe(before);
  });

  it("every citation's fieldPath/value pair (from all 16 topics combined) traces back to a real field already present on the report", () => {
    const report = makeReport();
    const answers = [...answerAllFounderQuestions(report), ...answerAdditionalFounderQuestions(report)];
    for (const answer of answers) {
      for (const citation of answer.citations) {
        expect(citation.value).toBe(resolveReportFieldPath(report, citation.fieldPath));
      }
    }
  });
});

describe("Phase 9 — why-build / why-not-build cite real founderIntelligence.founderOpportunity.why/whyNot + real risk", () => {
  it("why-build cites why[], businessOpportunity, and businessModel with no false-positive notVerified", () => {
    const report = makeReport();
    const result = answerFounderQuestion(report, "Why build this?");
    expect(result.answer).toContain(report.aiDecisionValidation.finalRecommendation.businessOpportunity);
    expect(result.answer).toContain(report.businessIntelligence.businessModel);
    expect(result.citations.some((c) => c.fieldPath === "founderIntelligence.founderOpportunity.why")).toBe(true);
    expect(result.notVerified).toBe(false);
  });

  it("why-not-build cites whyNot[] and the highest-scoring real risk (Monetization Risk=85 in this fixture)", () => {
    const report = makeReport();
    const result = answerFounderQuestion(report, "Why NOT build this?");
    expect(result.answer).toContain("Monetization Risk");
    expect(result.answer).toContain("85/100");
    expect(result.citations.some((c) => c.fieldPath.match(/^aiDecisionValidation\.risks\[\d+\]\.risk$/) && c.value === "Monetization Risk")).toBe(true);
  });
});

describe("Phase 9 — who-pays / how-price cite real businessIntelligence/revenueIntelligence fields", () => {
  it("who-pays cites primaryBuyer/decisionMaker/companySize/b2bVsB2c", () => {
    const report = makeReport();
    const result = answerFounderQuestion(report, "Who pays for this?");
    expect(result.topic).toBe("who-pays");
    expect(result.answer).toContain(report.businessIntelligence.primaryBuyer);
    expect(result.answer).toContain(report.businessIntelligence.decisionMaker);
    expect(result.citations.some((c) => c.fieldPath === "businessIntelligence.primaryBuyer")).toBe(true);
    expect(result.citations.some((c) => c.fieldPath === "businessIntelligence.decisionMaker")).toBe(true);
    expect(result.citations.some((c) => c.fieldPath === "businessIntelligence.companySize")).toBe(true);
    expect(result.citations.some((c) => c.fieldPath === "businessIntelligence.b2bVsB2c")).toBe(true);
  });

  it("how-price cites revenueIntelligence.possiblePricing (real extracted prices) and businessIntelligence.budgetEstimate", () => {
    const report = makeReport();
    const result = answerFounderQuestion(report, "How should I price it?");
    expect(result.topic).toBe("how-price");
    expect(result.answer).toContain("$29");
    expect(result.answer).toContain("$99");
    expect(result.answer).toContain("subscription");
    expect(result.citations.some((c) => c.fieldPath === "revenueIntelligence.possiblePricing")).toBe(true);
    expect(result.citations.some((c) => c.fieldPath === "businessIntelligence.budgetEstimate")).toBe(true);
  });
});

describe("Phase 9 — what-build-first / get-customers cite real mvpPlan/goToMarket fields", () => {
  it("what-build-first cites mvpPlan.coreFeatures and mvpPlan.scopeSummary", () => {
    const report = makeReport();
    const result = answerFounderQuestion(report, "What should I build first?");
    expect(result.topic).toBe("what-build-first");
    expect(result.answer).toContain("Missing API");
    expect(result.citations.some((c) => c.fieldPath === "mvpPlan.coreFeatures")).toBe(true);
    expect(result.citations.some((c) => c.fieldPath === "mvpPlan.scopeSummary")).toBe(true);
  });

  it("get-customers cites goToMarket.recommendedChannels and positioningStatement", () => {
    const report = makeReport();
    const result = answerFounderQuestion(report, "How do I get customers?");
    expect(result.topic).toBe("get-customers");
    expect(result.answer).toContain("Developer communities");
    expect(result.citations.some((c) => c.fieldPath === "goToMarket.recommendedChannels[0].channel")).toBe(true);
    // No evidenced differentiation strategy in this fixture -> positioningStatement is honestly NOT VERIFIED.
    expect(result.notVerified).toBe(true);
    expect(result.answer).toContain("NOT VERIFIED");
  });
});

describe("Phase 9 — differentiate / market-weak cite real founderIntelligence/marketIntelligence/technicalBlueprint fields", () => {
  it("differentiate is honestly NOT VERIFIED when founderIntelligence.differentiationStrategies is empty (default fixture)", () => {
    const report = makeReport();
    expect(report.founderIntelligence.differentiationStrategies).toEqual([]);
    const result = answerFounderQuestion(report, "How do I differentiate?");
    expect(result.topic).toBe("differentiate");
    expect(result.notVerified).toBe(true);
    expect(result.answer).toContain("No evidence-backed differentiation strategy exists");
  });

  it("differentiate cites a real evidence-backed strategy + a non-sentinel technicalBlueprint.aiLayerAdvice when AI-first is evidenced", () => {
    const reportWithStrategy = makeReport(
      {},
      {
        founderIntelligence: {
          ...makeFounderIntelligence(),
          differentiationStrategies: [{ strategy: "AI-first", evidenceReason: "founderIntelligence.marketGaps includes \"Missing AI\"." }],
        },
      },
    );
    const result = answerFounderQuestion(reportWithStrategy, "How do I differentiate?");
    expect(result.topic).toBe("differentiate");
    expect(result.answer).toContain("AI-first");
    expect(result.answer).not.toContain("NOT VERIFIED");
    expect(result.notVerified).toBe(false);
    expect(result.citations.some((c) => c.fieldPath === "founderIntelligence.differentiationStrategies[0].strategy" && c.value === "AI-first")).toBe(true);
  });

  it("market-weak cites real saturation/opportunityWindow/growthStage with no false-positive notVerified in the default (early/opening) fixture", () => {
    const report = makeReport();
    const result = answerFounderQuestion(report, "Where is the market weak?");
    expect(result.topic).toBe("market-weak");
    expect(result.answer).toContain("Saturation:");
    expect(result.answer).toContain(report.marketIntelligence.saturation);
    expect(result.answer).toContain(report.marketIntelligence.opportunityWindow);
    expect(result.notVerified).toBe(false);
  });

  it("market-weak cites 'no evidence-backed gap was detected' when founderIntelligence.marketGaps is empty", () => {
    const report = makeReport();
    expect(report.founderIntelligence.marketGaps).toEqual([]);
    const result = answerFounderQuestion(report, "Where is the market weak?");
    expect(result.answer).toContain("no evidence-backed gap was detected");
  });
});

/* ======================================================================= */
/* Phase 9 — isSentinelUnverifiedValue additive fix (UNKNOWN / insufficient-data / unclear) */
/* ======================================================================= */

describe("Phase 9 — sentinel-detection fix: catches UNKNOWN / insufficient-data / unclear", () => {
  it("catches literal 'UNKNOWN' emitted by businessIntelligence.primaryBuyer/decisionMaker (bestCustomer with no matched buyer-role signal)", () => {
    const report = makeReport(
      {},
      {
        founderIntelligence: {
          ...makeFounderIntelligence(),
          founderOpportunity: { ...makeFounderIntelligence().founderOpportunity, bestCustomer: "a mystery segment with no matched signal" },
        },
      },
    );
    expect(report.businessIntelligence.primaryBuyer).toBe("UNKNOWN");
    expect(report.businessIntelligence.decisionMaker).toBe("UNKNOWN");

    const result = answerFounderQuestion(report, "Who pays for this?");
    expect(result.notVerified).toBe(true);
    expect(result.answer).toContain("NOT VERIFIED");
    expect(result.answer).toContain("businessIntelligence.primaryBuyer");
  });

  it("catches 'insufficient-data' growthStage / 'unclear' opportunityWindow emitted by marketIntelligence when the source cluster's growth is insufficient-data", () => {
    const report = makeReport({}, {}, { frequency: { mentions: 5, uniqueAuthors: 3, uniqueSources: 2, engagementTotal: 10, growth: { label: "insufficient-data", recentHalfCount: 0, earlierHalfCount: 0, ratio: null } } });
    expect(report.marketIntelligence.growthStage).toBe("insufficient-data");
    expect(report.marketIntelligence.opportunityWindow).toBe("unclear");

    const result = answerFounderQuestion(report, "Where is the market weak?");
    expect(result.notVerified).toBe(true);
    expect(result.answer).toContain("NOT VERIFIED");
    expect(result.answer).toMatch(/marketIntelligence\.(growthStage|opportunityWindow)/);
  });

  it("the pre-existing sentinel matches (literal 'NOT VERIFIED' substring, exact 'unknown'/'not-verified') still fire on the new topics (no regression)", () => {
    const report = makeReport();
    // businessIntelligence.budgetEstimate is the literal "NOT VERIFIED" sentinel in this fixture (no pricing evidence).
    expect(report.businessIntelligence.budgetEstimate).toBe("NOT VERIFIED");
    const howPrice = answerFounderQuestion(report, "How should I price it?");
    expect(howPrice.notVerified).toBe(true);
    // businessIntelligence.companySize is the exact "unknown" sentinel in this fixture (competitorIntelligence.enterpriseVsSmb="unknown").
    expect(report.businessIntelligence.companySize).toBe("unknown");
    const whoPays = answerFounderQuestion(report, "Who pays for this?");
    expect(whoPays.notVerified).toBe(true);
  });
});
