import type { ReviewerOutput, CourtContext } from "./types.js";
import {
  reviewAsFounder,
  reviewAsCustomer,
  reviewAsCTO,
  reviewAsProduct,
  reviewAsUX,
  reviewAsGrowth,
  reviewAsSales,
  reviewAsMarketing,
  reviewAsInvestor,
  reviewAsCompetitor,
  reviewAsSecurity,
  reviewAsLegal,
  reviewAsOperations,
  reviewAsRealityGuardian,
} from "./reviewers/index.js";

// ---------------------------------------------------------------------------
// Debate Engine
// Runs all 14 reviewers and returns their ordered outputs.
// ---------------------------------------------------------------------------

const REVIEWER_FNS: Array<(ctx: CourtContext) => ReviewerOutput> = [
  reviewAsFounder,
  reviewAsCustomer,
  reviewAsCTO,
  reviewAsProduct,
  reviewAsUX,
  reviewAsGrowth,
  reviewAsSales,
  reviewAsMarketing,
  reviewAsInvestor,
  reviewAsCompetitor,
  reviewAsSecurity,
  reviewAsLegal,
  reviewAsOperations,
  reviewAsRealityGuardian,
];

export function runDebate(ctx: CourtContext): ReviewerOutput[] {
  return REVIEWER_FNS.map((fn) => fn(ctx));
}
