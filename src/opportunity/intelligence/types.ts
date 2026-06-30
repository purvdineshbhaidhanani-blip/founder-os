import type { Timestamp } from "../../types/common.js";
import type { CollectorSource, ContentCategory, Opportunity } from "../types.js";

// ---------------------------------------------------------------------------
// Individual engine scores
// ---------------------------------------------------------------------------

export interface NoiseScore {
  score: number;         // 0–1; 1 = pure signal, 0 = pure noise
  isNoise: boolean;
  reasons: string[];
}

export interface SourceTrustScore {
  score: number;         // 0–1 weighted average across sources
  perSource: Record<string, number>;
}

export interface AuthorCredibilityScore {
  score: number;         // 0–1 average across evidence authors
  highCredibilityCount: number;
}

export interface FreshnessScore {
  score: number;         // 0–1; 1 = all evidence < 30 days
  oldestEvidenceDays: number;
  newestEvidenceDays: number;
}

export interface ExistingSolutionScore {
  score: number;         // 0–1; 1 = no adequate solution (maximum opportunity), 0 = already solved
  workaroundCount: number;
  solutionFailureSignals: string[];
}

export type MarketSizeTier = "tiny" | "small" | "medium" | "large" | "massive";

export interface MarketSizeEstimate {
  tier: MarketSizeTier;
  estimatedTAMBillions: number;   // rough upper bound
  score: number;                  // 0–1; 1 = massive market
  rationale: string;
}

export interface HumanTimeSavedScore {
  score: number;                  // 0–1
  estimatedHoursPerWeekPerUser: number;
  annualisedValueUSD: number;     // rough at $75/hr knowledge worker rate
}

export interface AIReadinessScore {
  score: number;         // 0–1; 1 = AI obviously solves this today
  rationale: string;
}

export interface TechnicalFeasibilityScore {
  score: number;         // 0–1; 1 = buildable by small team in <6 months
  estimatedTeamSize: number;
  estimatedTimeToMVP: string;
  legalRiskLevel: "low" | "medium" | "high";
  rationale: string;
}

export interface OpportunityGapScore {
  score: number;         // 0–1; composite of solution failure + market + pain + buying intent + AI
  rationale: string;
}

// ---------------------------------------------------------------------------
// Checklist — every opportunity must answer these 14 questions
// ---------------------------------------------------------------------------

export interface IntelligenceChecklist {
  isRealProblem: boolean;
  isBusinessRelated: boolean;
  isPainRepeated: boolean;
  arePeopleLookingForSolutions: boolean;
  arePeopleAlreadyPaying: boolean;
  doExistingSolutionsFail: boolean;
  isThereAMarket: boolean;
  canAISolveIt: boolean;
  isTechnicallyPossible: boolean;
  isLegallySafe: boolean;
  canStartupBuildIt: boolean;
  hasRecurringRevenuePotential: boolean;
  isOpportunityGrowing: boolean;
  isConfidenceHighEnough: boolean;
}

// ---------------------------------------------------------------------------
// Rejection
// ---------------------------------------------------------------------------

export type RejectionReason =
  | "entertainment-only"
  | "meme-or-viral"
  | "political-content"
  | "celebrity-content"
  | "no-evidence"
  | "no-buying-intent"
  | "one-off-complaint"
  | "already-perfectly-solved"
  | "tiny-market"
  | "technically-impossible"
  | "high-legal-risk"
  | "low-confidence"
  | "noise-dominated";

// ---------------------------------------------------------------------------
// Full intelligence record — wraps an Opportunity with scored intelligence
// ---------------------------------------------------------------------------

export interface OpportunityIntelligence {
  opportunityId: string;
  problem: string;
  category: ContentCategory;
  sources: CollectorSource[];

  // 10 engine scores
  noiseScore: NoiseScore;
  sourceTrustScore: SourceTrustScore;
  authorCredibilityScore: AuthorCredibilityScore;
  freshnessScore: FreshnessScore;
  existingSolutionScore: ExistingSolutionScore;
  marketSizeEstimate: MarketSizeEstimate;
  humanTimeSavedScore: HumanTimeSavedScore;
  aiReadinessScore: AIReadinessScore;
  technicalFeasibilityScore: TechnicalFeasibilityScore;
  opportunityGapScore: OpportunityGapScore;

  // Checklist
  checks: IntelligenceChecklist;

  // Verdict
  rejected: boolean;
  rejectionReasons: RejectionReason[];

  // Aggregate
  overallConfidence: number;  // 0–1

  scoredAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Scoring context passed to every engine
// ---------------------------------------------------------------------------

export interface ScoringContext {
  opportunity: Opportunity;
  allText: string;   // concatenation of all evidence quotes
  nowMs: number;     // Date.now() at scoring time; avoids per-engine calls
}
