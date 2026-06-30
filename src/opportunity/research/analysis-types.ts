import type { CourtDecision, CourtVerdict } from "../decision/types.js";
import type { OpportunityIntelligence } from "../intelligence/types.js";
import type { BusinessBlueprint } from "../blueprint/types.js";
import type { Opportunity } from "../types.js";

// ---------------------------------------------------------------------------
// Ranked opportunity — opportunity + scores + court decision in one record
// ---------------------------------------------------------------------------

export interface RankedOpportunity {
  rank: number;
  opportunity: Opportunity;
  intelligence: OpportunityIntelligence;
  decision: CourtDecision;
  /** Business Blueprint — generated for non-rejected opportunities */
  blueprint?: BusinessBlueprint;
  /** Composite ranking score: 0–1 */
  finalScore: number;
}

// ---------------------------------------------------------------------------
// Analysis stats
// ---------------------------------------------------------------------------

export interface BlueprintStats {
  generated: number;
  skipped: number;
}

export interface AnalysisStats {
  opportunitiesAnalyzed: number;
  opportunitiesAccepted: number;
  opportunitiesRejected: number;
  verdictBreakdown: Partial<Record<CourtVerdict, number>>;
  avgConfidence: number;
  durationMs: number;
  blueprints: BlueprintStats;
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
