import { nowIso } from "../../utils/id.js";
import type { CourtDecision, CourtContext } from "./types.js";
import type { OpportunityIntelligence } from "../intelligence/types.js";
import { runDebate } from "./debate-engine.js";
import { runDevilsAdvocate } from "./devil-advocate.js";
import { aggregateEvidence } from "./evidence-engine.js";
import { calculateConsensus } from "./consensus-engine.js";
import { determineVerdict } from "./verdict-engine.js";

// ---------------------------------------------------------------------------
// Decision Court
// Orchestrates the full debate pipeline and produces a final CourtDecision.
// ---------------------------------------------------------------------------

export function runDecisionCourt(intelligence: OpportunityIntelligence): CourtDecision {
  const ctx: CourtContext = { intelligence };

  // 1. Run all 14 reviewers
  const reviewerOutputs = runDebate(ctx);

  // 2. Devil's Advocate — independent rejection attempt
  const devilsAdvocate = runDevilsAdvocate(ctx);

  // 3. Aggregate evidence across reviewers
  const { topArgumentsFor, topArgumentsAgainst, evidenceSummary, risks, unknowns } = aggregateEvidence(reviewerOutputs);

  // 4. Consensus scoring
  const consensus = calculateConsensus(reviewerOutputs);

  // 5. Verdict
  const { verdict, rationale: verdictRationale, confidence } = determineVerdict({
    outputs: reviewerOutputs,
    consensus,
    devilsAdvocate,
    intelligenceScore: intelligence.overallConfidence,
  });

  // 6. Executive summary
  const executiveSummary = buildExecutiveSummary({
    problem: intelligence.problem,
    category: intelligence.category,
    verdict,
    confidence,
    topFor: topArgumentsFor[0]?.claim ?? "—",
    topAgainst: topArgumentsAgainst[0]?.claim ?? "—",
    marketTier: intelligence.marketSizeEstimate.tier,
    devilsSurvived: devilsAdvocate.survived,
    approveCount: reviewerOutputs.filter((o) => o.verdict === "approve").length,
    totalReviewers: reviewerOutputs.length,
  });

  return {
    opportunityId: intelligence.opportunityId,
    problem: intelligence.problem,
    category: intelligence.category,
    intelligenceScore: intelligence.overallConfidence,
    reviewerOutputs,
    devilsAdvocate,
    consensus,
    topArgumentsFor,
    topArgumentsAgainst,
    evidenceSummary,
    risks,
    unknowns,
    verdict,
    verdictRationale,
    confidence,
    executiveSummary,
    decidedAt: nowIso(),
  };
}

// ---------------------------------------------------------------------------
// Executive summary builder
// ---------------------------------------------------------------------------

interface SummaryInputs {
  problem: string;
  category: string;
  verdict: string;
  confidence: number;
  topFor: string;
  topAgainst: string;
  marketTier: string;
  devilsSurvived: boolean;
  approveCount: number;
  totalReviewers: number;
}

function buildExecutiveSummary(inputs: SummaryInputs): string {
  const { problem, category, verdict, confidence, topFor, topAgainst, marketTier, devilsSurvived, approveCount, totalReviewers } = inputs;
  const pct = Math.round(confidence * 100);
  const advocateResult = devilsSurvived ? "survived Devil's Advocate" : "failed Devil's Advocate";

  return [
    `PROBLEM: ${problem}`,
    `CATEGORY: ${category} | MARKET: ${marketTier}`,
    `VERDICT: ${verdict} (${pct}% confidence) — ${approveCount}/${totalReviewers} reviewers approve — ${advocateResult}`,
    `FOR: ${topFor}`,
    `AGAINST: ${topAgainst}`,
  ].join("\n");
}
