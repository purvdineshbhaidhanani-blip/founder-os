import type { ContentCategory } from "../types.js";
import type { OpportunityIntelligence, RejectionReason } from "./types.js";

// ---------------------------------------------------------------------------
// Intelligence Database
// In-memory store for OpportunityIntelligence records with filtering/sorting.
// ---------------------------------------------------------------------------

export interface IntelligenceQueryOptions {
  includeRejected?: boolean;
  category?: ContentCategory;
  minConfidence?: number;
  maxResults?: number;
}

export class IntelligenceDatabase {
  private readonly records = new Map<string, OpportunityIntelligence>();

  upsert(record: OpportunityIntelligence): void {
    this.records.set(record.opportunityId, record);
  }

  get(opportunityId: string): OpportunityIntelligence | undefined {
    return this.records.get(opportunityId);
  }

  query(options: IntelligenceQueryOptions = {}): OpportunityIntelligence[] {
    const { includeRejected = false, category, minConfidence = 0, maxResults } = options;

    let results = [...this.records.values()];

    if (!includeRejected) results = results.filter((r) => !r.rejected);
    if (category) results = results.filter((r) => r.category === category);
    if (minConfidence > 0) results = results.filter((r) => r.overallConfidence >= minConfidence);

    // Sort by overallConfidence desc, then opportunityGapScore desc
    results.sort((a, b) => {
      const diff = b.overallConfidence - a.overallConfidence;
      return diff !== 0 ? diff : b.opportunityGapScore.score - a.opportunityGapScore.score;
    });

    return maxResults !== undefined ? results.slice(0, maxResults) : results;
  }

  /** All accepted (non-rejected) records sorted by confidence. */
  accepted(): OpportunityIntelligence[] {
    return this.query({ includeRejected: false });
  }

  /** All rejected records. */
  rejected(): OpportunityIntelligence[] {
    return [...this.records.values()].filter((r) => r.rejected);
  }

  /** Accepted records by category. */
  byCategory(category: ContentCategory): OpportunityIntelligence[] {
    return this.query({ category });
  }

  /** Records rejected for a specific reason. */
  rejectedFor(reason: RejectionReason): OpportunityIntelligence[] {
    return [...this.records.values()].filter((r) => r.rejectionReasons.includes(reason));
  }

  size(): number {
    return this.records.size;
  }

  acceptedCount(): number {
    return [...this.records.values()].filter((r) => !r.rejected).length;
  }

  rejectedCount(): number {
    return [...this.records.values()].filter((r) => r.rejected).length;
  }

  toJSON(): OpportunityIntelligence[] {
    return this.accepted();
  }

  clear(): void {
    this.records.clear();
  }
}
