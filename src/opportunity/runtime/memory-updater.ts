import { nowIso } from "../../utils/id.js";
import type { OpportunityIntelligence } from "../intelligence/types.js";
import type { CourtDecision } from "../decision/types.js";
import type { BusinessBlueprint } from "../blueprint/types.js";
import type { ChampionRecord } from "./types.js";
import type { AuditLog } from "./audit-log.js";

// ---------------------------------------------------------------------------
// Memory Updater — integrates with Founder OS memory system
// ---------------------------------------------------------------------------

export interface MemoryEntry {
  key: string;
  value: unknown;
  updatedAt: string;
  category: "opportunity" | "champion" | "blueprint" | "learning";
}

export class MemoryUpdater {
  private readonly store = new Map<string, MemoryEntry>();

  constructor(private readonly audit: AuditLog) {}

  updateOpportunity(intel: OpportunityIntelligence): void {
    this.set(
      `opportunity:${intel.opportunityId}:intelligence`,
      {
        opportunityId: intel.opportunityId,
        overallConfidence: intel.overallConfidence,
        isRejected: intel.rejected,
        rejectionReason: intel.rejectionReasons[0],
        scoredAt: intel.scoredAt,
      },
      "opportunity",
    );
  }

  updateDecision(decision: CourtDecision): void {
    this.set(
      `opportunity:${decision.opportunityId}:decision`,
      {
        opportunityId: decision.opportunityId,
        verdict: decision.verdict,
        confidence: decision.confidence,
        decidedAt: decision.decidedAt,
      },
      "opportunity",
    );
  }

  updateBlueprint(blueprint: BusinessBlueprint): void {
    this.set(
      `opportunity:${blueprint.opportunityId}:blueprint`,
      {
        opportunityId: blueprint.opportunityId,
        verdict: blueprint.founderRecommendation.verdict,
        confidence: blueprint.confidence,
        generatedAt: blueprint.generatedAt,
      },
      "blueprint",
    );
  }

  updateChampion(champion: ChampionRecord): void {
    this.set("champion:current", {
      opportunityId: champion.opportunityId,
      score: champion.score,
      championSince: champion.championSince,
      tournamentWins: champion.tournamentWins,
    }, "champion");
  }

  get(key: string): MemoryEntry | undefined {
    return this.store.get(key);
  }

  all(): MemoryEntry[] {
    return [...this.store.values()];
  }

  byCategory(category: MemoryEntry["category"]): MemoryEntry[] {
    return [...this.store.values()].filter((e) => e.category === category);
  }

  size(): number {
    return this.store.size;
  }

  private set(key: string, value: unknown, category: MemoryEntry["category"]): void {
    this.store.set(key, { key, value, updatedAt: nowIso(), category });
  }
}
