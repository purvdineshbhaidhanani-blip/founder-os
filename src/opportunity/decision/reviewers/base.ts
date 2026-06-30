import type { ReviewerOutput, CourtContext } from "../types.js";

export interface IReviewer {
  review(ctx: CourtContext): ReviewerOutput;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export function arg(claim: string, weight: number, evidence: string[] = []): import("../types.js").DebateArgument {
  return { claim, weight, evidence };
}

export function clamp(v: number, lo = 0, hi = 1): number {
  return Math.max(lo, Math.min(hi, v));
}
