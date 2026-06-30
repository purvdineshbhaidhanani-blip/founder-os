import type { RankedOpportunity, AnalysisResult } from "./analysis-types.js";
import type { ResearchSession } from "./types.js";
import type { CourtVerdict } from "../decision/types.js";

// ---------------------------------------------------------------------------
// Session Comparison
// Diffs two research sessions' opportunity sets to surface changes.
// ---------------------------------------------------------------------------

export interface OpportunityDiff {
  opportunityId: string;
  problemSummary: string;
  prevRank: number;
  currRank: number;
  rankDelta: number;
  prevScore: number;
  currScore: number;
  scoreDelta: number;
  prevVerdict: CourtVerdict;
  currVerdict: CourtVerdict;
  verdictChanged: boolean;
  prevConfidence: number;
  currConfidence: number;
  confidenceDelta: number;
}

export interface ChampionChange {
  prevChampion: string | null;
  currChampion: string | null;
  changed: boolean;
}

export interface ComparisonResult {
  sessionA: ResearchSession;
  sessionB: ResearchSession;
  /** Opportunities in B not present in A (new discoveries) */
  newOpportunities: Array<{ opportunityId: string; problemSummary: string; rank: number; verdict: CourtVerdict }>;
  /** Opportunities in A not present in B (disappeared) */
  removedOpportunities: Array<{ opportunityId: string; problemSummary: string }>;
  /** Opportunities present in both, sorted by biggest score change */
  scoreChanges: OpportunityDiff[];
  /** Champion change between sessions */
  championChange: ChampionChange;
  /** Summary stats */
  summary: {
    newCount: number;
    removedCount: number;
    changedCount: number;
    totalA: number;
    totalB: number;
  };
}

export function compareSessions(
  sessionA: ResearchSession,
  analysisA: AnalysisResult | null,
  sessionB: ResearchSession,
  analysisB: AnalysisResult | null,
): ComparisonResult {
  const allA: RankedOpportunity[] = analysisA?.all ?? [];
  const allB: RankedOpportunity[] = analysisB?.all ?? [];

  const mapA = new Map(allA.map((r) => [r.opportunity.id, r]));
  const mapB = new Map(allB.map((r) => [r.opportunity.id, r]));

  // New in B
  const newOpportunities = allB
    .filter((r) => !mapA.has(r.opportunity.id))
    .map((r) => ({
      opportunityId: r.opportunity.id,
      problemSummary: r.opportunity.problemSummary,
      rank: r.rank,
      verdict: r.decision.verdict,
    }));

  // Removed from A
  const removedOpportunities = allA
    .filter((r) => !mapB.has(r.opportunity.id))
    .map((r) => ({ opportunityId: r.opportunity.id, problemSummary: r.opportunity.problemSummary }));

  // Score changes for shared opportunities
  const scoreChanges: OpportunityDiff[] = [];
  for (const [id, bR] of mapB) {
    const aR = mapA.get(id);
    if (!aR) continue;
    const scoreDelta = bR.finalScore - aR.finalScore;
    const confidenceDelta = bR.intelligence.overallConfidence - aR.intelligence.overallConfidence;
    const rankDelta = aR.rank - bR.rank;  // positive = moved up
    scoreChanges.push({
      opportunityId: id,
      problemSummary: bR.opportunity.problemSummary,
      prevRank: aR.rank,
      currRank: bR.rank,
      rankDelta,
      prevScore: aR.finalScore,
      currScore: bR.finalScore,
      scoreDelta,
      prevVerdict: aR.decision.verdict,
      currVerdict: bR.decision.verdict,
      verdictChanged: aR.decision.verdict !== bR.decision.verdict,
      prevConfidence: aR.intelligence.overallConfidence,
      currConfidence: bR.intelligence.overallConfidence,
      confidenceDelta,
    });
  }
  scoreChanges.sort((a, b) => Math.abs(b.scoreDelta) - Math.abs(a.scoreDelta));

  // Champion change
  const prevChampion = analysisA?.topOpportunity?.opportunity.problemSummary ?? null;
  const currChampion = analysisB?.topOpportunity?.opportunity.problemSummary ?? null;
  const championChange: ChampionChange = {
    prevChampion,
    currChampion,
    changed: prevChampion !== currChampion,
  };

  return {
    sessionA,
    sessionB,
    newOpportunities,
    removedOpportunities,
    scoreChanges,
    championChange,
    summary: {
      newCount: newOpportunities.length,
      removedCount: removedOpportunities.length,
      changedCount: scoreChanges.filter((c) => Math.abs(c.scoreDelta) > 0.01).length,
      totalA: allA.length,
      totalB: allB.length,
    },
  };
}
