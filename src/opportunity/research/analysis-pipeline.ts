import { generateId, nowIso } from "../../utils/id.js";
import { scoreOpportunity } from "../intelligence/scorer.js";
import { runDecisionCourt } from "../decision/court.js";
import { generateBlueprint } from "../blueprint/blueprint-engine.js";
import { IntelligenceDatabase } from "../intelligence/database.js";
import { DecisionHistory } from "../decision/decision-history.js";
import type { OpportunityStore } from "../opportunity-store.js";
import type { CourtVerdict } from "../decision/types.js";
import type { RankedOpportunity, AnalysisResult, AnalysisStats, BlueprintStats } from "./analysis-types.js";

// ---------------------------------------------------------------------------
// Verdict ranking weight — drives final score tiebreaking
// ---------------------------------------------------------------------------

const VERDICT_WEIGHT: Record<CourtVerdict, number> = {
  BUILD_NOW: 1.0,
  RESEARCH_MORE: 0.70,
  WAIT: 0.45,
  MONITOR: 0.25,
  REJECT: 0.0,
};

// ---------------------------------------------------------------------------
// Analysis Pipeline
// Takes opportunities from an OpportunityStore, runs the full Intelligence +
// Decision Court + Business Blueprint pipeline, ranks results, returns AnalysisResult.
// ---------------------------------------------------------------------------

export class AnalysisPipeline {
  readonly intelligenceDb: IntelligenceDatabase;
  readonly decisionHistory: DecisionHistory;

  constructor(
    intelligenceDb?: IntelligenceDatabase,
    decisionHistory?: DecisionHistory,
  ) {
    this.intelligenceDb = intelligenceDb ?? new IntelligenceDatabase();
    this.decisionHistory = decisionHistory ?? new DecisionHistory();
  }

  async run(
    opportunityStore: OpportunityStore,
    sessionId: string,
  ): Promise<AnalysisResult> {
    const analysisId = generateId("analysis");
    const runAt = nowIso();
    const t0 = Date.now();

    const opportunities = opportunityStore.list();
    const ranked: RankedOpportunity[] = [];
    let blueprintsGenerated = 0;

    for (const opportunity of opportunities) {
      const intelligence = scoreOpportunity(opportunity);
      this.intelligenceDb.upsert(intelligence);

      const decision = runDecisionCourt(intelligence);
      this.decisionHistory.record(decision);

      const vw = VERDICT_WEIGHT[decision.verdict];
      const finalScore =
        intelligence.overallConfidence * 0.4 +
        decision.confidence * 0.4 +
        vw * 0.2;

      // Generate Business Blueprint for accepted, non-rejected opportunities
      let blueprint = undefined;
      if (!intelligence.rejected && decision.verdict !== "REJECT") {
        blueprint = generateBlueprint(intelligence, decision);
        blueprintsGenerated++;
      }

      ranked.push({
        rank: 0,  // assigned below after sort
        opportunity,
        intelligence,
        decision,
        blueprint,
        finalScore,
      });
    }

    // Sort descending by finalScore; assign ranks
    ranked.sort((a, b) => b.finalScore - a.finalScore);
    for (let i = 0; i < ranked.length; i++) {
      ranked[i]!.rank = i + 1;
    }

    const accepted = ranked.filter((r) => !r.intelligence.rejected && r.decision.verdict !== "REJECT");
    const rejected = ranked.filter((r) => r.intelligence.rejected || r.decision.verdict === "REJECT");

    const top10 = accepted.slice(0, 10);
    const topOpportunity = top10[0] ?? null;

    // Verdict breakdown
    const verdictBreakdown: Partial<Record<CourtVerdict, number>> = {};
    for (const r of ranked) {
      verdictBreakdown[r.decision.verdict] = (verdictBreakdown[r.decision.verdict] ?? 0) + 1;
    }

    const avgConfidence =
      ranked.length > 0
        ? ranked.reduce((s, r) => s + r.intelligence.overallConfidence, 0) / ranked.length
        : 0;

    const blueprintStats: BlueprintStats = {
      generated: blueprintsGenerated,
      skipped: ranked.length - blueprintsGenerated,
    };

    const stats: AnalysisStats = {
      opportunitiesAnalyzed: ranked.length,
      opportunitiesAccepted: accepted.length,
      opportunitiesRejected: rejected.length,
      verdictBreakdown,
      avgConfidence,
      durationMs: Date.now() - t0,
      blueprints: blueprintStats,
    };

    const evidenceSummary = buildEvidenceSummary(top10);
    const decisionSummary = buildDecisionSummary(top10, verdictBreakdown, ranked.length);

    return {
      analysisId,
      sessionId,
      runAt,
      topOpportunity,
      top10,
      rejected,
      all: ranked,
      evidenceSummary,
      decisionSummary,
      avgConfidence,
      stats,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildEvidenceSummary(top10: RankedOpportunity[]): string[] {
  return top10.slice(0, 5).map((r) => {
    const { opportunity: opp, intelligence: intel, decision } = r;
    const mkt = intel.marketSizeEstimate.tier;
    const ai = intel.aiReadinessScore.score.toFixed(2);
    return (
      `[${decision.verdict}] ${opp.problemSummary} — ` +
      `confidence=${intel.overallConfidence.toFixed(2)}, ` +
      `market=${mkt}, ai_readiness=${ai}, ` +
      `signals=${opp.signalCount}, sources=${opp.sources.join("+")}`
    );
  });
}

function buildDecisionSummary(
  top10: RankedOpportunity[],
  breakdown: Partial<Record<CourtVerdict, number>>,
  total: number,
): string {
  const buildNow = breakdown["BUILD_NOW"] ?? 0;
  const researchMore = breakdown["RESEARCH_MORE"] ?? 0;
  const rejected = breakdown["REJECT"] ?? 0;
  const topVerdict = top10[0]?.decision.verdict ?? "none";
  const topProblem = top10[0]?.opportunity.problemSummary.slice(0, 80) ?? "—";
  return (
    `Analyzed ${total} opportunities. ` +
    `BUILD_NOW=${buildNow}, RESEARCH_MORE=${researchMore}, REJECT=${rejected}. ` +
    `Top opportunity (${topVerdict}): "${topProblem}".`
  );
}
