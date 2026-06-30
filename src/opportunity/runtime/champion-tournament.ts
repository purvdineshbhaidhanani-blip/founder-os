import { generateId, nowIso } from "../../utils/id.js";
import type { OpportunityIntelligence } from "../intelligence/types.js";
import type { CourtDecision } from "../decision/types.js";
import type { BusinessBlueprint } from "../blueprint/types.js";
import type { ChampionRecord, TournamentResult, TournamentMatch } from "./types.js";
import type { AuditLog } from "./audit-log.js";

// ---------------------------------------------------------------------------
// Champion Tournament — pairwise elimination, single champion, full history
// ---------------------------------------------------------------------------

function computeScore(intel: OpportunityIntelligence, decision: CourtDecision): number {
  // Weighted blend of intelligence confidence + court confidence
  return intel.overallConfidence * 0.5 + decision.confidence * 0.5;
}

export class ChampionTournament {
  private champion: ChampionRecord | null = null;
  private readonly history: TournamentResult[] = [];

  constructor(private readonly audit: AuditLog) {}

  run(
    entrants: Array<{
      intelligence: OpportunityIntelligence;
      decision: CourtDecision;
      blueprint: BusinessBlueprint;
    }>,
  ): TournamentResult {
    if (entrants.length === 0) {
      throw new Error("Tournament requires at least one entrant");
    }

    const ranked = entrants
      .map((e) => ({ ...e, score: computeScore(e.intelligence, e.decision) }))
      .sort((a, b) => b.score - a.score);

    const matches: TournamentMatch[] = [];

    // Pairwise — each participant vs the next
    for (let i = 0; i < ranked.length - 1; i++) {
      const a = ranked[i]!;
      const b = ranked[i + 1]!;
      const match: TournamentMatch = {
        challengerId: a.intelligence.opportunityId,
        defenderId: b.intelligence.opportunityId,
        challengerScore: a.score,
        defenderScore: b.score,
        winner: a.score >= b.score ? "challenger" : "defender",
        margin: Math.abs(a.score - b.score),
        rationale: `${a.intelligence.opportunityId} score=${a.score.toFixed(3)} vs ${b.intelligence.opportunityId} score=${b.score.toFixed(3)}`,
      };
      matches.push(match);
    }

    const topEntrant = ranked[0]!;
    const previousChampionId = this.champion?.opportunityId ?? null;

    const newChampion: ChampionRecord = {
      opportunityId: topEntrant.intelligence.opportunityId,
      intelligence: topEntrant.intelligence,
      decision: topEntrant.decision,
      blueprint: topEntrant.blueprint,
      championSince: this.champion?.opportunityId === topEntrant.intelligence.opportunityId
        ? (this.champion.championSince)
        : nowIso(),
      tournamentWins: (this.champion?.opportunityId === topEntrant.intelligence.opportunityId
        ? this.champion.tournamentWins
        : 0) + 1,
      score: topEntrant.score,
    };

    const championChanged = previousChampionId !== newChampion.opportunityId;
    this.champion = newChampion;

    const result: TournamentResult = {
      tournamentId: generateId("trn"),
      ranAt: nowIso(),
      participants: entrants.length,
      champion: newChampion,
      previousChampionId,
      championChanged,
      matches,
      rankings: ranked.map((e, idx) => ({
        opportunityId: e.intelligence.opportunityId,
        rank: idx + 1,
        score: e.score,
      })),
    };

    this.history.push(result);

    const action = championChanged ? "champion-replaced" : "champion-set";
    this.audit.log(action, {
      opportunityId: newChampion.opportunityId,
      score: newChampion.score,
      previousChampionId,
    }, newChampion.opportunityId, "champion");

    return result;
  }

  getChampion(): ChampionRecord | null {
    return this.champion;
  }

  getHistory(): TournamentResult[] {
    return [...this.history];
  }

  lastResult(): TournamentResult | null {
    return this.history.at(-1) ?? null;
  }

  totalRuns(): number {
    return this.history.length;
  }

  championChanges(): number {
    return this.history.filter((r) => r.championChanged).length;
  }
}
