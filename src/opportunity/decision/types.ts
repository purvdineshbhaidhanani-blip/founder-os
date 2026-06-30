import type { Timestamp } from "../../types/common.js";
import type { ContentCategory } from "../types.js";
import type { OpportunityIntelligence } from "../intelligence/types.js";

// ---------------------------------------------------------------------------
// Reviewer roles
// ---------------------------------------------------------------------------

export type ReviewerRole =
  | "founder"
  | "customer"
  | "cto"
  | "product"
  | "ux"
  | "growth"
  | "sales"
  | "marketing"
  | "investor"
  | "competitor"
  | "security"
  | "legal"
  | "operations"
  | "reality-guardian";

// ---------------------------------------------------------------------------
// Debate argument
// ---------------------------------------------------------------------------

export interface DebateArgument {
  claim: string;
  weight: number;        // 0–1 strength of this argument
  evidence: string[];    // supporting quotes / data points
}

// ---------------------------------------------------------------------------
// Per-reviewer output
// ---------------------------------------------------------------------------

export type ReviewerVerdict = "approve" | "reject" | "neutral";

export interface ReviewerOutput {
  role: ReviewerRole;
  argumentsFor: DebateArgument[];
  argumentsAgainst: DebateArgument[];
  evidence: string[];
  assumptions: string[];
  unknowns: string[];
  risks: string[];
  verdict: ReviewerVerdict;
  confidence: number;    // 0–1 how confident this reviewer is
  summary: string;
}

// ---------------------------------------------------------------------------
// Devil's Advocate result
// ---------------------------------------------------------------------------

export type DevilsAdvocateRejectionReason =
  | "market-too-small"
  | "weak-demand"
  | "existing-solution-dominates"
  | "low-willingness-to-pay"
  | "temporary-trend"
  | "high-legal-risk"
  | "high-technical-complexity"
  | "easy-to-copy"
  | "low-confidence";

export interface DevilsAdvocateResult {
  rejectionAttempts: DevilsAdvocateRejectionReason[];
  survived: boolean;   // true = opportunity survived devil's scrutiny
  rebuttal: string;    // why it survived (or didn't)
  weakestPoint: string;
  strongestPoint: string;
}

// ---------------------------------------------------------------------------
// Consensus scores
// ---------------------------------------------------------------------------

export interface ConsensusScore {
  agreementScore: number;    // 0–1 fraction of reviewers aligned on verdict
  conflictScore: number;     // 0–1 degree of disagreement (1 = fully split)
  evidenceScore: number;     // 0–1 average evidence weight across reviewers
  riskScore: number;         // 0–1 aggregate risk (1 = very high risk)
  confidenceScore: number;   // 0–1 blended confidence across all dimensions
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

export type CourtVerdict = "BUILD_NOW" | "RESEARCH_MORE" | "WAIT" | "MONITOR" | "REJECT";

// ---------------------------------------------------------------------------
// Full court decision
// ---------------------------------------------------------------------------

export interface CourtDecision {
  opportunityId: string;
  problem: string;
  category: ContentCategory;
  intelligenceScore: number;    // overallConfidence from OpportunityIntelligence

  reviewerOutputs: ReviewerOutput[];
  devilsAdvocate: DevilsAdvocateResult;
  consensus: ConsensusScore;

  topArgumentsFor: DebateArgument[];
  topArgumentsAgainst: DebateArgument[];
  evidenceSummary: string[];
  risks: string[];
  unknowns: string[];

  verdict: CourtVerdict;
  verdictRationale: string;
  confidence: number;    // final blended confidence in the verdict

  executiveSummary: string;

  decidedAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Court context — passed to every reviewer
// ---------------------------------------------------------------------------

export interface CourtContext {
  intelligence: OpportunityIntelligence;
}
