import { nowIso } from "../../utils/id.js";
import type { ContentCategory } from "../types.js";
import type { CourtVerdict } from "../decision/types.js";
import type { DashboardState } from "./types.js";
import type { ChampionTournament } from "./champion-tournament.js";
import type { OpportunityMonitor } from "./opportunity-monitor.js";
import type { OpportunityArchive } from "./opportunity-archive.js";
import type { RuntimeHealthMonitor } from "./runtime-health-monitor.js";

// ---------------------------------------------------------------------------
// Founder Dashboard Engine — live dashboard state
// ---------------------------------------------------------------------------

export class FounderDashboardEngine {
  constructor(
    private readonly tournament: ChampionTournament,
    private readonly monitor: OpportunityMonitor,
    private readonly archive: OpportunityArchive,
    private readonly health: RuntimeHealthMonitor,
  ) {}

  generate(): DashboardState {
    const champion = this.tournament.getChampion();
    const lastResult = this.tournament.lastResult();

    const top10 = lastResult
      ? lastResult.rankings
          .slice(0, 10)
          .map((r) => {
            const champ = this.tournament.getChampion();
            return champ && champ.opportunityId === r.opportunityId
              ? champ
              : null;
          })
          .filter((c): c is NonNullable<typeof c> => c !== null)
      : champion
        ? [champion]
        : [];

    const allStates = this.monitor.all();

    const opportunitiesByVerdict: Record<CourtVerdict, number> = {
      BUILD_NOW: 0,
      RESEARCH_MORE: 0,
      WAIT: 0,
      MONITOR: 0,
      REJECT: 0,
    };

    const opportunitiesByCategory: Partial<Record<ContentCategory, number>> = {};

    for (const state of allStates) {
      // We can only count here — detailed breakdown requires decision access
      // Monitor tracks scores, not verdicts, so we use placeholder
    }

    const avgConfidence =
      allStates.length > 0
        ? allStates.reduce((s, st) => s + st.currentScore, 0) / allStates.length
        : 0;

    const newThisWeek = this.monitor.newThisWindow(7 * 24 * 60 * 60 * 1000).length;
    const archivedThisWeek = this.archive.recentlyArchived(7 * 24 * 60 * 60 * 1000).length;

    return {
      generatedAt: nowIso(),
      champion,
      top10,
      totalOpportunities: allStates.length,
      opportunitiesByVerdict,
      opportunitiesByCategory,
      newThisWeek,
      archivedThisWeek,
      averageConfidence: avgConfidence,
      lastPipelineRun: null,
      runtimeHealth: this.health.check(),
    };
  }
}
