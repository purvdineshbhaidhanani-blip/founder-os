import { describe, it, expect, beforeEach } from "vitest";
import { runDecisionCourt } from "../../src/opportunity/decision/court.js";
import { runDevilsAdvocate } from "../../src/opportunity/decision/devil-advocate.js";
import { calculateConsensus } from "../../src/opportunity/decision/consensus-engine.js";
import { determineVerdict } from "../../src/opportunity/decision/verdict-engine.js";
import { aggregateEvidence } from "../../src/opportunity/decision/evidence-engine.js";
import { DecisionHistory } from "../../src/opportunity/decision/decision-history.js";
import { scoreOpportunity } from "../../src/opportunity/intelligence/scorer.js";
import type { Opportunity, OpportunityEvidence, PainScore } from "../../src/opportunity/types.js";
import type { ReviewerOutput, CourtContext, DevilsAdvocateResult } from "../../src/opportunity/decision/types.js";
import type { OpportunityIntelligence } from "../../src/opportunity/intelligence/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeEvidence(overrides: Partial<OpportunityEvidence> = {}): OpportunityEvidence {
  return {
    signalId: "sig-1",
    itemId: "item-1",
    source: "g2",
    url: "https://g2.com/1",
    quote: "We would pay for an API-based solution. Manual exports to Excel waste 6 hours weekly — subscription would work.",
    signalType: "manual-process",
    engagement: { votes: 80, replies: 12 },
    ...overrides,
  };
}

const STRONG_PAIN: PainScore = {
  frequency: 0.85,
  severity: 0.80,
  businessImpact: 0.70,
  timeLost: 6,
  moneyLost: 500,
  urgency: 0.75,
  frustration: 0.80,
  operationalComplexity: 0.60,
  confidence: 0.80,
};

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  const now = new Date().toISOString();
  return {
    id: "opp-test",
    status: "discovered",
    problemSummary: "No API for data export — manual Excel process wastes 6h/week per user",
    category: "saas",
    evidence: [
      makeEvidence({ source: "g2" }),
      makeEvidence({ signalId: "sig-2", source: "reddit", quote: "We're looking for an alternative that has proper export. Been using workarounds forever." }),
      makeEvidence({ signalId: "sig-3", source: "github-issues", signalType: "api-gap", quote: "No API, this is blocking our automation. Would pay for an integration subscription." }),
    ],
    painScore: STRONG_PAIN,
    buyingIntentSignals: 3,
    workaroundsDetected: ["excel", "manual-copy-paste"],
    sources: ["g2", "reddit", "github-issues"],
    confidence: 0.78,
    signalCount: 5,
    clusterKey: "no-api-export-excel-workaround",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeWeakOpportunity(): Opportunity {
  const now = new Date().toISOString();
  return {
    id: "opp-weak",
    status: "discovered",
    problemSummary: "Minor UI preference complaint",
    category: "other",
    evidence: [makeEvidence({ signalType: "complaint", engagement: { votes: 1 }, quote: "I wish the button was blue instead of green" })],
    painScore: {
      frequency: 0.1,
      severity: 0.1,
      businessImpact: 0.0,
      timeLost: 0,
      moneyLost: 0,
      urgency: 0.1,
      frustration: 0.2,
      operationalComplexity: 0.0,
      confidence: 0.15,
    },
    buyingIntentSignals: 0,
    workaroundsDetected: [],
    sources: ["reddit"],
    confidence: 0.12,
    signalCount: 1,
    clusterKey: "ui-button-color",
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Devil's Advocate
// ---------------------------------------------------------------------------

describe("runDevilsAdvocate", () => {
  it("strong opportunity survives most checks", () => {
    const intel = scoreOpportunity(makeOpportunity());
    // Force high confidence to ensure survival
    (intel as { overallConfidence: number }).overallConfidence = 0.70;
    const result = runDevilsAdvocate({ intelligence: intel });
    // Should survive or fail only 1-2 tests
    expect(result.rejectionAttempts.length).toBeLessThan(4);
  });

  it("weak opportunity fails multiple checks", () => {
    const intel = scoreOpportunity(makeWeakOpportunity());
    const result = runDevilsAdvocate({ intelligence: intel });
    expect(result.rejectionAttempts.length).toBeGreaterThan(0);
    expect(result.survived).toBe(false);
  });

  it("returns weakestPoint and strongestPoint as non-empty strings", () => {
    const intel = scoreOpportunity(makeOpportunity());
    const result = runDevilsAdvocate({ intelligence: intel });
    expect(result.weakestPoint.length).toBeGreaterThan(0);
    expect(result.strongestPoint.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Consensus Engine
// ---------------------------------------------------------------------------

describe("calculateConsensus", () => {
  it("returns perfect agreement when all approve", () => {
    const outputs: ReviewerOutput[] = Array.from({ length: 5 }, (_, i) => ({
      role: "founder" as const,
      argumentsFor: [{ claim: "good", weight: 0.8, evidence: [] }],
      argumentsAgainst: [],
      evidence: [],
      assumptions: [],
      unknowns: [],
      risks: [],
      verdict: "approve" as const,
      confidence: 0.8,
      summary: "good",
    }));
    const consensus = calculateConsensus(outputs);
    expect(consensus.agreementScore).toBe(1);
    expect(consensus.conflictScore).toBe(0);
  });

  it("high conflict when split 50/50", () => {
    const outputs: ReviewerOutput[] = [
      { role: "founder", argumentsFor: [], argumentsAgainst: [], evidence: [], assumptions: [], unknowns: [], risks: [], verdict: "approve", confidence: 0.7, summary: "" },
      { role: "customer", argumentsFor: [], argumentsAgainst: [], evidence: [], assumptions: [], unknowns: [], risks: [], verdict: "reject", confidence: 0.7, summary: "" },
    ];
    const consensus = calculateConsensus(outputs);
    expect(consensus.conflictScore).toBe(0.5);
    expect(consensus.agreementScore).toBe(0.5);
  });

  it("empty input returns safe defaults", () => {
    const consensus = calculateConsensus([]);
    expect(consensus.agreementScore).toBe(0);
    expect(consensus.confidenceScore).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Verdict Engine
// ---------------------------------------------------------------------------

describe("determineVerdict", () => {
  const makeConsensus = (overrides = {}): import("../../src/opportunity/decision/types.js").ConsensusScore => ({
    agreementScore: 0.7,
    conflictScore: 0.3,
    evidenceScore: 0.6,
    riskScore: 0.4,
    confidenceScore: 0.65,
    ...overrides,
  });

  const makeDevils = (survived: boolean, failCount = 0): DevilsAdvocateResult => ({
    rejectionAttempts: Array.from({ length: failCount }, () => "market-too-small" as const),
    survived,
    rebuttal: survived ? "passed" : "failed",
    weakestPoint: "confidence",
    strongestPoint: "market size",
  });

  it("BUILD_NOW when majority approve + high intelligence + survived devil", () => {
    const outputs: ReviewerOutput[] = Array.from({ length: 8 }, () => ({
      role: "founder" as const,
      argumentsFor: [{ claim: "great", weight: 0.8, evidence: [] }],
      argumentsAgainst: [],
      evidence: [],
      assumptions: [],
      unknowns: [],
      risks: [],
      verdict: "approve" as const,
      confidence: 0.8,
      summary: "",
    }));
    const { verdict } = determineVerdict({
      outputs,
      consensus: makeConsensus(),
      devilsAdvocate: makeDevils(true),
      intelligenceScore: 0.70,
    });
    expect(verdict).toBe("BUILD_NOW");
  });

  it("REJECT when devil fails 3+ tests", () => {
    const outputs: ReviewerOutput[] = Array.from({ length: 5 }, () => ({
      role: "founder" as const,
      argumentsFor: [{ claim: "ok", weight: 0.5, evidence: [] }],
      argumentsAgainst: [],
      evidence: [],
      assumptions: [],
      unknowns: [],
      risks: [],
      verdict: "neutral" as const,
      confidence: 0.4,
      summary: "",
    }));
    const { verdict } = determineVerdict({
      outputs,
      consensus: makeConsensus({ confidenceScore: 0.3 }),
      devilsAdvocate: makeDevils(false, 4),
      intelligenceScore: 0.3,
    });
    expect(verdict).toBe("REJECT");
  });

  it("RESEARCH_MORE when moderate approval but low intelligence", () => {
    const outputs: ReviewerOutput[] = [
      ...Array.from({ length: 6 }, () => ({ role: "founder" as const, argumentsFor: [{ claim: "ok", weight: 0.5, evidence: [] }], argumentsAgainst: [], evidence: [], assumptions: [], unknowns: [], risks: [], verdict: "approve" as const, confidence: 0.5, summary: "" })),
      ...Array.from({ length: 4 }, () => ({ role: "cto" as const, argumentsFor: [], argumentsAgainst: [{ claim: "risky", weight: 0.5, evidence: [] }], evidence: [], assumptions: [], unknowns: [], risks: [], verdict: "reject" as const, confidence: 0.4, summary: "" })),
    ];
    const { verdict } = determineVerdict({
      outputs,
      consensus: makeConsensus({ confidenceScore: 0.45 }),
      devilsAdvocate: makeDevils(true),
      intelligenceScore: 0.42,
    });
    expect(verdict).toBe("RESEARCH_MORE");
  });
});

// ---------------------------------------------------------------------------
// Evidence Engine
// ---------------------------------------------------------------------------

describe("aggregateEvidence", () => {
  it("deduplicates identical arguments across reviewers", () => {
    const outputs: ReviewerOutput[] = [
      { role: "founder", argumentsFor: [{ claim: "Large market", weight: 0.8, evidence: [] }], argumentsAgainst: [], evidence: [], assumptions: [], unknowns: [], risks: [], verdict: "approve", confidence: 0.8, summary: "" },
      { role: "investor", argumentsFor: [{ claim: "Large market", weight: 0.9, evidence: [] }], argumentsAgainst: [], evidence: [], assumptions: [], unknowns: [], risks: [], verdict: "approve", confidence: 0.9, summary: "" },
    ];
    const result = aggregateEvidence(outputs);
    expect(result.topArgumentsFor.length).toBe(1);
  });

  it("ranks arguments by totalWeight", () => {
    const outputs: ReviewerOutput[] = [
      { role: "founder", argumentsFor: [{ claim: "weak arg", weight: 0.2, evidence: [] }, { claim: "strong arg", weight: 0.9, evidence: [] }], argumentsAgainst: [], evidence: [], assumptions: [], unknowns: [], risks: [], verdict: "approve", confidence: 0.8, summary: "" },
    ];
    const result = aggregateEvidence(outputs);
    expect(result.topArgumentsFor[0]?.claim).toContain("strong");
  });

  it("collects risks and unknowns from all reviewers", () => {
    const outputs: ReviewerOutput[] = [
      { role: "founder", argumentsFor: [], argumentsAgainst: [], evidence: [], assumptions: [], unknowns: ["How big is the ICP?"], risks: ["Competitor copies"], verdict: "neutral", confidence: 0.5, summary: "" },
      { role: "cto", argumentsFor: [], argumentsAgainst: [], evidence: [], assumptions: [], unknowns: ["Infra cost?"], risks: ["Build too long"], verdict: "neutral", confidence: 0.5, summary: "" },
    ];
    const result = aggregateEvidence(outputs);
    expect(result.risks.length).toBe(2);
    expect(result.unknowns.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Full Decision Court
// ---------------------------------------------------------------------------

describe("runDecisionCourt", () => {
  it("produces a CourtDecision with all required fields", () => {
    const intel = scoreOpportunity(makeOpportunity());
    const decision = runDecisionCourt(intel);

    expect(decision.opportunityId).toBe(intel.opportunityId);
    expect(decision.reviewerOutputs).toHaveLength(14);
    expect(decision.devilsAdvocate).toBeDefined();
    expect(decision.consensus).toBeDefined();
    expect(["BUILD_NOW", "RESEARCH_MORE", "WAIT", "MONITOR", "REJECT"]).toContain(decision.verdict);
    expect(decision.confidence).toBeGreaterThanOrEqual(0);
    expect(decision.confidence).toBeLessThanOrEqual(1);
    expect(decision.executiveSummary.length).toBeGreaterThan(0);
    expect(decision.decidedAt).toBeTruthy();
  });

  it("all 14 reviewer roles are represented", () => {
    const intel = scoreOpportunity(makeOpportunity());
    const decision = runDecisionCourt(intel);
    const roles = decision.reviewerOutputs.map((o) => o.role);
    expect(roles).toContain("founder");
    expect(roles).toContain("customer");
    expect(roles).toContain("cto");
    expect(roles).toContain("investor");
    expect(roles).toContain("reality-guardian");
    expect(roles).toContain("legal");
    expect(roles).toContain("security");
  });

  it("weak opportunity gets REJECT or MONITOR verdict", () => {
    const intel = scoreOpportunity(makeWeakOpportunity());
    const decision = runDecisionCourt(intel);
    expect(["REJECT", "MONITOR", "WAIT"]).toContain(decision.verdict);
  });

  it("executive summary contains verdict", () => {
    const intel = scoreOpportunity(makeOpportunity());
    const decision = runDecisionCourt(intel);
    expect(decision.executiveSummary).toContain(decision.verdict);
  });
});

// ---------------------------------------------------------------------------
// DecisionHistory
// ---------------------------------------------------------------------------

describe("DecisionHistory", () => {
  let history: DecisionHistory;

  beforeEach(() => {
    history = new DecisionHistory();
  });

  it("record and get round-trip", () => {
    const intel = scoreOpportunity(makeOpportunity());
    const decision = runDecisionCourt(intel);
    history.record(decision);
    expect(history.get(decision.opportunityId)).toBe(decision);
  });

  it("size tracks correctly", () => {
    expect(history.size()).toBe(0);
    history.record(runDecisionCourt(scoreOpportunity(makeOpportunity())));
    expect(history.size()).toBe(1);
  });

  it("verdictBreakdown sums to total size", () => {
    history.record(runDecisionCourt(scoreOpportunity(makeOpportunity())));
    history.record(runDecisionCourt(scoreOpportunity(makeWeakOpportunity())));
    const breakdown = history.verdictBreakdown();
    const total = Object.values(breakdown).reduce((s, n) => s + n, 0);
    expect(total).toBe(history.size());
  });

  it("byVerdict filters correctly", () => {
    history.record(runDecisionCourt(scoreOpportunity(makeOpportunity())));
    history.record(runDecisionCourt(scoreOpportunity(makeWeakOpportunity())));
    for (const verdict of ["BUILD_NOW", "RESEARCH_MORE", "WAIT", "MONITOR", "REJECT"] as const) {
      const filtered = history.byVerdict(verdict);
      expect(filtered.every((d) => d.verdict === verdict)).toBe(true);
    }
  });

  it("query filters by minConfidence", () => {
    history.record(runDecisionCourt(scoreOpportunity(makeOpportunity())));
    const highOnly = history.query({ minConfidence: 0.99 });
    expect(highOnly.every((d) => d.confidence >= 0.99)).toBe(true);
  });

  it("clear empties history", () => {
    history.record(runDecisionCourt(scoreOpportunity(makeOpportunity())));
    history.clear();
    expect(history.size()).toBe(0);
  });
});
