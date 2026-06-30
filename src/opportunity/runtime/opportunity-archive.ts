import { nowIso } from "../../utils/id.js";
import type { OpportunityIntelligence } from "../intelligence/types.js";
import type { AuditLog } from "./audit-log.js";

// ---------------------------------------------------------------------------
// Opportunity Archive — archives weak / expired opportunities
// ---------------------------------------------------------------------------

interface ArchivedEntry {
  opportunityId: string;
  reason: string;
  archivedAt: string;
  finalScore: number;
}

const WEAK_CONFIDENCE_THRESHOLD = 0.25;
const MAX_AGE_DAYS = 90;

export class OpportunityArchive {
  private readonly archived = new Map<string, ArchivedEntry>();

  constructor(private readonly audit: AuditLog) {}

  shouldArchive(intel: OpportunityIntelligence, nowMs = Date.now()): { archive: boolean; reason: string } {
    if (intel.overallConfidence < WEAK_CONFIDENCE_THRESHOLD) {
      return { archive: true, reason: `Low confidence: ${intel.overallConfidence.toFixed(2)}` };
    }

    if (intel.rejected) {
      return { archive: true, reason: `Rejected: ${intel.rejectionReasons[0] ?? "unknown"}` };
    }

    const ageDays = (nowMs - new Date(intel.scoredAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > MAX_AGE_DAYS) {
      return { archive: true, reason: `Stale: ${Math.round(ageDays)} days without update` };
    }

    return { archive: false, reason: "" };
  }

  archive(intel: OpportunityIntelligence, reason: string): ArchivedEntry {
    const entry: ArchivedEntry = {
      opportunityId: intel.opportunityId,
      reason,
      archivedAt: nowIso(),
      finalScore: intel.overallConfidence,
    };
    this.archived.set(intel.opportunityId, entry);
    this.audit.log("opportunity-archived", { opportunityId: intel.opportunityId, reason }, intel.opportunityId, "opportunity");
    return entry;
  }

  isArchived(opportunityId: string): boolean {
    return this.archived.has(opportunityId);
  }

  getArchived(opportunityId: string): ArchivedEntry | undefined {
    return this.archived.get(opportunityId);
  }

  recentlyArchived(windowMs = 7 * 24 * 60 * 60 * 1000): ArchivedEntry[] {
    const cutoff = Date.now() - windowMs;
    return [...this.archived.values()].filter((e) => new Date(e.archivedAt).getTime() >= cutoff);
  }

  size(): number {
    return this.archived.size;
  }

  toJSON(): ArchivedEntry[] {
    return [...this.archived.values()].sort(
      (a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime(),
    );
  }
}
