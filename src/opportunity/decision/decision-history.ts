import type { CourtDecision, CourtVerdict } from "./types.js";
import type { ContentCategory } from "../types.js";

// ---------------------------------------------------------------------------
// Decision History
// Searchable store of past Court decisions.
// ---------------------------------------------------------------------------

export interface DecisionQueryOptions {
  verdict?: CourtVerdict;
  category?: ContentCategory;
  minConfidence?: number;
  maxResults?: number;
}

export class DecisionHistory {
  private readonly decisions = new Map<string, CourtDecision>();

  record(decision: CourtDecision): void {
    this.decisions.set(decision.opportunityId, decision);
  }

  get(opportunityId: string): CourtDecision | undefined {
    return this.decisions.get(opportunityId);
  }

  query(options: DecisionQueryOptions = {}): CourtDecision[] {
    const { verdict, category, minConfidence = 0, maxResults } = options;
    let results = [...this.decisions.values()];

    if (verdict) results = results.filter((d) => d.verdict === verdict);
    if (category) results = results.filter((d) => d.category === category);
    if (minConfidence > 0) results = results.filter((d) => d.confidence >= minConfidence);

    results.sort((a, b) => b.confidence - a.confidence);
    return maxResults !== undefined ? results.slice(0, maxResults) : results;
  }

  byVerdict(verdict: CourtVerdict): CourtDecision[] {
    return this.query({ verdict });
  }

  buildNow(): CourtDecision[] {
    return this.byVerdict("BUILD_NOW");
  }

  rejected(): CourtDecision[] {
    return this.byVerdict("REJECT");
  }

  needsResearch(): CourtDecision[] {
    return this.byVerdict("RESEARCH_MORE");
  }

  size(): number {
    return this.decisions.size;
  }

  verdictBreakdown(): Record<CourtVerdict, number> {
    const breakdown: Record<CourtVerdict, number> = {
      BUILD_NOW: 0,
      RESEARCH_MORE: 0,
      WAIT: 0,
      MONITOR: 0,
      REJECT: 0,
    };
    for (const d of this.decisions.values()) {
      breakdown[d.verdict]++;
    }
    return breakdown;
  }

  toJSON(): CourtDecision[] {
    return [...this.decisions.values()].sort((a, b) => b.confidence - a.confidence);
  }

  clear(): void {
    this.decisions.clear();
  }
}
