import type {
  ClassifiedItem,
  ProblemCategory,
  ProblemCluster,
  ProblemIntelligenceReport,
} from "../problems/types.js";
import type { RawResearchItem, ResearchSession } from "../research/types.js";

/**
 * Founder Opportunity Reports engine surface. Turns the deterministic
 * ProblemIntelligenceReport clusters into ranked, founder-facing build
 * opportunities. No LLM call — every formula/threshold below is a fixed
 * constant, mirroring src/problems' Reality Guard philosophy of never
 * inventing certainty.
 */

export interface BuyingIntentResult {
  score: number; // 0-1
  matchingItemCount: number;
  totalItemCount: number;
  explanation: string;
}

export interface CompetitorMention {
  name: string; // extracted text
  mentionCount: number;
  evidenceUrls: string[];
}

export interface CompetitionResult {
  competitors: CompetitorMention[]; // sorted by mentionCount desc
  competitionScore: number; // 0-1, see formula below
  explanation: string;
}

export type BuildDifficultyTier = "low" | "medium" | "high";

export interface BuildDifficultyResult {
  tier: BuildDifficultyTier;
  matchedSignals: string[];
  explanation: string; // must include the phrase "heuristic estimate, not an engineering estimate"
}

export interface PricingSignal {
  extractedPrices: number[]; // deduplicated, sorted ascending
  suggestedPriceText: string;
}

export interface OpportunityScoreBreakdown {
  painFrequency: number;
  sourceDiversity: number;
  authorDiversity: number;
  buyingIntent: number;
  engagement: number;
  growth: number;
  competition: number;
  confidence: number;
  weightedTotal: number; // 0-1, the final opportunityScore
  explanation: string; // lists each factor's raw value, weight, and contribution
}

export type FounderRecommendationVerdict = "BUILD" | "WAIT" | "IGNORE";

export interface FounderRecommendation {
  verdict: FounderRecommendationVerdict;
  whyBuild: string[];
  whyNotBuild: string[];
  risk: string[];
  explanation: string; // states the exact threshold comparison that produced the verdict
}

export interface FounderOpportunityReport {
  id: string;
  clusterId: string; // from the source ProblemCluster
  category: string;
  problem: string; // the cluster's normalizedStatement
  summary: string;
  painScore: number; // = scoreBreakdown.painFrequency
  buyingIntent: BuyingIntentResult;
  competition: CompetitionResult;
  confidence: { band: string; score: number }; // copied from the source cluster
  scoreBreakdown: OpportunityScoreBreakdown;
  supportingEvidence: { evidenceCount: number; sourceBreakdown: Record<string, number>; urls: string[] };
  representativeQuotes: Array<{ text: string; url: string; source: string }>; // from cluster's representativeExamples
  recommendedMvp: string;
  suggestedPricing: PricingSignal;
  targetUsers: string;
  buildDifficulty: BuildDifficultyResult;
  estimatedTimeToMvp: string;
  recommendation: FounderRecommendation;
  createdAt: string;
  sourceSessionId: string;
  sourceProblemReportId: string;
}

export interface TopOpportunitiesReport {
  id: string;
  sourceSessionId: string;
  sourceProblemReportId: string;
  opportunities: FounderOpportunityReport[]; // top 10, sorted by scoreBreakdown.weightedTotal descending
  totalClustersConsidered: number;
  generatedAt: string;
  artifactId?: string;
}

/** Referenced for downstream typing convenience — re-exported for callers. */
export type {
  ClassifiedItem,
  ProblemCategory,
  ProblemCluster,
  ProblemIntelligenceReport,
  RawResearchItem,
  ResearchSession,
};
