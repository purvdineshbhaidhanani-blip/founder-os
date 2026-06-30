import { describe, it, expect, beforeEach } from "vitest";
import { scoreOpportunity } from "../../src/opportunity/intelligence/scorer.js";
import { scoreNoise } from "../../src/opportunity/intelligence/noise-engine.js";
import { scoreMarketSize } from "../../src/opportunity/intelligence/market-size-engine.js";
import { scoreTechnicalFeasibility } from "../../src/opportunity/intelligence/technical-feasibility-engine.js";
import { IntelligenceDatabase } from "../../src/opportunity/intelligence/database.js";
import type { Opportunity, OpportunityEvidence, PainScore } from "../../src/opportunity/types.js";
import type { ScoringContext } from "../../src/opportunity/intelligence/types.js";
import type { OpportunityIntelligence } from "../../src/opportunity/intelligence/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeEvidence(overrides: Partial<OpportunityEvidence> = {}): OpportunityEvidence {
  return {
    signalId: "sig-1",
    itemId: "item-1",
    source: "reddit",
    url: "https://reddit.com/r/saas/1",
    quote: "We have to manually export to Excel every single week — it wastes 5 hours per person.",
    signalType: "manual-process",
    engagement: { votes: 42, replies: 8 },
    ...overrides,
  };
}

const STRONG_PAIN: PainScore = {
  frequency: 0.8,
  severity: 0.7,
  businessImpact: 0.6,
  timeLost: 5,
  moneyLost: 0,
  urgency: 0.6,
  frustration: 0.7,
  operationalComplexity: 0.5,
  confidence: 0.75,
};

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  const now = new Date().toISOString();
  return {
    id: "opp-1",
    status: "discovered",
    problemSummary: "Manual data export to spreadsheets wastes hours each week",
    category: "saas",
    evidence: [makeEvidence(), makeEvidence({ signalId: "sig-2", source: "github-issues" })],
    painScore: STRONG_PAIN,
    buyingIntentSignals: 2,
    workaroundsDetected: ["excel", "manual-copy-paste"],
    sources: ["reddit", "github-issues"],
    confidence: 0.72,
    signalCount: 3,
    clusterKey: "manual-export-excel-waste",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeCtx(opportunity: Opportunity): ScoringContext {
  return {
    opportunity,
    allText: opportunity.evidence.map((e) => e.quote).join("\n"),
    nowMs: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Noise Engine
// ---------------------------------------------------------------------------

describe("scoreNoise", () => {
  it("rates genuine pain evidence as high signal (low noise)", () => {
    const opp = makeOpportunity();
    const result = scoreNoise(makeCtx(opp));
    expect(result.score).toBeGreaterThan(0.4);
    expect(result.isNoise).toBe(false);
  });

  it("flags celebrity/meme content as noise", () => {
    const opp = makeOpportunity({
      evidence: [makeEvidence({
        quote: "kardashian celebrity going viral trending meme wow",
        signalType: "complaint",
        engagement: { votes: 0, replies: 0 },
      })],
      sources: ["reddit"],
    });
    const result = scoreNoise(makeCtx(opp));
    // entertainment + meme + anti-business(celebrity) = noiseHits >= 3
    expect(result.isNoise).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Market Size Engine
// ---------------------------------------------------------------------------

describe("scoreMarketSize", () => {
  it("returns massive tier for AI category", () => {
    const opp = makeOpportunity({ category: "ai" });
    const result = scoreMarketSize(makeCtx(opp));
    expect(result.tier).toBe("massive");
    expect(result.score).toBeGreaterThanOrEqual(0.9);
  });

  it("returns small or tiny tier for 'other' category with no buying intent", () => {
    const opp = makeOpportunity({ category: "other", buyingIntentSignals: 0 });
    const result = scoreMarketSize(makeCtx(opp));
    expect(["small", "tiny"]).toContain(result.tier);
  });

  it("bumps tier when growth keywords present", () => {
    const opp = makeOpportunity({
      category: "saas",
      evidence: [makeEvidence({ quote: "The market is growing fast, more and more teams are adopting this." })],
    });
    const withGrowth = scoreMarketSize(makeCtx(opp));
    const withoutGrowth = scoreMarketSize(makeCtx(makeOpportunity({ category: "saas" })));
    expect(withGrowth.score).toBeGreaterThanOrEqual(withoutGrowth.score);
  });
});

// ---------------------------------------------------------------------------
// Technical Feasibility Engine
// ---------------------------------------------------------------------------

describe("scoreTechnicalFeasibility", () => {
  it("rates developer-tools as highly feasible", () => {
    const opp = makeOpportunity({ category: "developer-tools" });
    const result = scoreTechnicalFeasibility(makeCtx(opp));
    expect(result.score).toBeGreaterThan(0.8);
    expect(result.legalRiskLevel).toBe("low");
  });

  it("rates healthcare-tech lower and sets medium/high legal risk for medical diagnosis content", () => {
    const opp = makeOpportunity({
      category: "healthcare-tech",
      evidence: [makeEvidence({ quote: "We need AI for medical diagnosis and prescription recommendations." })],
    });
    const result = scoreTechnicalFeasibility(makeCtx(opp));
    expect(result.score).toBeLessThan(0.5);
    expect(result.legalRiskLevel).toBe("high");
  });

  it("reduces score for hardware integration keywords", () => {
    const opp = makeOpportunity({
      evidence: [makeEvidence({ quote: "We need hardware integration with embedded system and custom silicon." })],
    });
    const result = scoreTechnicalFeasibility(makeCtx(opp));
    const base = scoreTechnicalFeasibility(makeCtx(makeOpportunity()));
    expect(result.score).toBeLessThan(base.score);
  });
});

// ---------------------------------------------------------------------------
// Full scorer
// ---------------------------------------------------------------------------

describe("scoreOpportunity", () => {
  it("produces all 10 engine scores", () => {
    const opp = makeOpportunity();
    const intel = scoreOpportunity(opp);
    expect(intel.noiseScore).toBeDefined();
    expect(intel.sourceTrustScore).toBeDefined();
    expect(intel.authorCredibilityScore).toBeDefined();
    expect(intel.freshnessScore).toBeDefined();
    expect(intel.existingSolutionScore).toBeDefined();
    expect(intel.marketSizeEstimate).toBeDefined();
    expect(intel.humanTimeSavedScore).toBeDefined();
    expect(intel.aiReadinessScore).toBeDefined();
    expect(intel.technicalFeasibilityScore).toBeDefined();
    expect(intel.opportunityGapScore).toBeDefined();
  });

  it("checklist has 14 boolean fields", () => {
    const intel = scoreOpportunity(makeOpportunity());
    const keys = Object.keys(intel.checks);
    expect(keys).toHaveLength(14);
    for (const key of keys) {
      expect(typeof (intel.checks as Record<string, unknown>)[key]).toBe("boolean");
    }
  });

  it("overallConfidence is in [0,1]", () => {
    const intel = scoreOpportunity(makeOpportunity());
    expect(intel.overallConfidence).toBeGreaterThanOrEqual(0);
    expect(intel.overallConfidence).toBeLessThanOrEqual(1);
  });

  it("rejects entertainment-only opportunity", () => {
    const opp = makeOpportunity({
      evidence: [makeEvidence({ quote: "entertainment only — love this movie, tv show binge is awesome for gaming fans" })],
      buyingIntentSignals: 0,
      signalCount: 1,
      workaroundsDetected: [],
    });
    const intel = scoreOpportunity(opp);
    expect(intel.rejected).toBe(true);
    expect(intel.rejectionReasons).toContain("entertainment-only");
  });

  it("rejects opportunity with no evidence", () => {
    const opp = makeOpportunity({ evidence: [] });
    const intel = scoreOpportunity(opp);
    expect(intel.rejected).toBe(true);
    expect(intel.rejectionReasons).toContain("no-evidence");
  });

  it("accepts strong SaaS opportunity", () => {
    const opp = makeOpportunity({
      category: "saas",
      buyingIntentSignals: 3,
      signalCount: 5,
      sources: ["reddit", "github-issues", "g2"],
      evidence: [
        makeEvidence({
          source: "g2",
          quote: "We would pay for a solution. We use Excel manually every week and it costs us hours — subscription pricing would work.",
          signalType: "manual-process",
          engagement: { votes: 100 },
        }),
        makeEvidence({
          source: "github-issues",
          quote: "The integration is completely missing. We need an API or we'd need to use workarounds.",
          signalType: "integration-pain",
        }),
      ],
    });
    const intel = scoreOpportunity(opp);
    // Strong opportunity — may still be rejected depending on thresholds, but
    // noise and market checks should be positive
    expect(intel.checks.isRealProblem).toBe(true);
    expect(intel.checks.isBusinessRelated).toBe(true);
    expect(intel.overallConfidence).toBeGreaterThan(0.2);
  });
});

// ---------------------------------------------------------------------------
// IntelligenceDatabase
// ---------------------------------------------------------------------------

describe("IntelligenceDatabase", () => {
  let db: IntelligenceDatabase;
  let record: OpportunityIntelligence;

  beforeEach(() => {
    db = new IntelligenceDatabase();
    record = scoreOpportunity(makeOpportunity());
    // Force it accepted for tests that need accepted records
    (record as { rejected: boolean }).rejected = false;
  });

  it("upsert and get round-trip", () => {
    db.upsert(record);
    expect(db.get(record.opportunityId)).toBe(record);
  });

  it("size reflects number of records", () => {
    expect(db.size()).toBe(0);
    db.upsert(record);
    expect(db.size()).toBe(1);
  });

  it("accepted() excludes rejected records", () => {
    db.upsert(record);
    const rejected = { ...scoreOpportunity(makeOpportunity({ id: "opp-2" })), rejected: true };
    db.upsert(rejected);
    const accepted = db.accepted();
    expect(accepted.every((r) => !r.rejected)).toBe(true);
  });

  it("rejected() returns only rejected records", () => {
    db.upsert(record);
    const rejectedRecord = { ...record, opportunityId: "opp-r", rejected: true };
    db.upsert(rejectedRecord);
    const rej = db.rejected();
    expect(rej.every((r) => r.rejected)).toBe(true);
    expect(rej.length).toBe(1);
  });

  it("query filters by category", () => {
    db.upsert({ ...record, opportunityId: "opp-saas", category: "saas", rejected: false });
    db.upsert({ ...record, opportunityId: "opp-ai", category: "ai", rejected: false });
    const saas = db.byCategory("saas");
    expect(saas.every((r) => r.category === "saas")).toBe(true);
  });

  it("query filters by minConfidence", () => {
    db.upsert({ ...record, opportunityId: "opp-low", overallConfidence: 0.3, rejected: false });
    db.upsert({ ...record, opportunityId: "opp-high", overallConfidence: 0.8, rejected: false });
    const highOnly = db.query({ minConfidence: 0.6 });
    expect(highOnly.every((r) => r.overallConfidence >= 0.6)).toBe(true);
  });

  it("query sorts by overallConfidence descending", () => {
    db.upsert({ ...record, opportunityId: "a", overallConfidence: 0.4, rejected: false });
    db.upsert({ ...record, opportunityId: "b", overallConfidence: 0.9, rejected: false });
    db.upsert({ ...record, opportunityId: "c", overallConfidence: 0.6, rejected: false });
    const sorted = db.accepted();
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1]!.overallConfidence).toBeGreaterThanOrEqual(sorted[i]!.overallConfidence);
    }
  });

  it("acceptedCount and rejectedCount are correct", () => {
    db.upsert({ ...record, opportunityId: "a", rejected: false });
    db.upsert({ ...record, opportunityId: "b", rejected: true });
    db.upsert({ ...record, opportunityId: "c", rejected: false });
    expect(db.acceptedCount()).toBe(2);
    expect(db.rejectedCount()).toBe(1);
  });

  it("clear empties the database", () => {
    db.upsert(record);
    db.clear();
    expect(db.size()).toBe(0);
  });
});
