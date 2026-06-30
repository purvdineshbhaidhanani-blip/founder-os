import type { CourtDecision, CourtVerdict } from "../decision/types.js";
import type { OpportunityIntelligence } from "../intelligence/types.js";
import type { Opportunity } from "../types.js";

// ---------------------------------------------------------------------------
// Ranked opportunity — opportunity + scores + court decision in one record
// ---------------------------------------------------------------------------

export interface RankedOpportunity {
  rank: number;
  opportunity: Opportunity;
  intelligence: OpportunityIntelligence;
  decision: CourtDecision;
  /** Composite ranking score: 0–1 */
  finalScore: number;
}

// ---------------------------------------------------------------------------
// Analysis stats
// ---------------------------------------------------------------------------

export interface AnalysisStats {
  opportunitiesAnalyzed: number;
  opportunitiesAccepted: number;
  opportunitiesRejected: number;
  verdictBreakdown: Partial<Record<CourtVerdict, number>>;
  avgConfidence: number;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Full analysis result produced by AnalysisPipeline
// ---------------------------------------------------------------------------

export interface AnalysisResult {
  analysisId: string;
  sessionId: string;
  runAt: string;
  topOpportunity: RankedOpportunity | null;
  top10: RankedOpportunity[];
  rejected: RankedOpportunity[];
  all: RankedOpportunity[];
  evidenceSummary: string[];
  decisionSummary: string;
  avgConfidence: number;
  stats: AnalysisStats;
}
