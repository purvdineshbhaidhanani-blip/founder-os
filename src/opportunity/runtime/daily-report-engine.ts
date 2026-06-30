import { generateId, nowIso } from "../../utils/id.js";
import type { DailyReport, ChangeEvent, ReportSection } from "./types.js";
import type { ChampionTournament } from "./champion-tournament.js";
import type { OpportunityMonitor } from "./opportunity-monitor.js";
import type { OpportunityArchive } from "./opportunity-archive.js";
import type { ChangeDetectionEngine } from "./change-detection-engine.js";
import type { HistoricalLearningEngine } from "./historical-learning-engine.js";
import type { AuditLog } from "./audit-log.js";

// ---------------------------------------------------------------------------
// Daily Report Engine — daily founder report
// ---------------------------------------------------------------------------

export class DailyReportEngine {
  constructor(
    private readonly tournament: ChampionTournament,
    private readonly monitor: OpportunityMonitor,
    private readonly archive: OpportunityArchive,
    private readonly changeDetection: ChangeDetectionEngine,
    private readonly learning: HistoricalLearningEngine,
    private readonly audit: AuditLog,
  ) {}

  generate(date = today()): DailyReport {
    const champion = this.tournament.getChampion();
    const lastResult = this.tournament.lastResult();
    const top10 = lastResult ? lastResult.rankings.slice(0, 10).map((r) => {
      const champ = this.tournament.getChampion();
      return champ && champ.opportunityId === r.opportunityId ? champ : null;
    }).filter((c): c is NonNullable<typeof c> => c !== null) : champion ? [champion] : [];

    const dayMs = 24 * 60 * 60 * 1000;
    const newOpps = this.monitor.newThisWindow(dayMs).map((s) => s.opportunityId);
    const lostOpps = this.archive.recentlyArchived(dayMs).map((a) => a.opportunityId);

    const recentChanges = this.changeDetection.recentEvents(dayMs);
    const changedOpps = recentChanges.map((e) => ({
      opportunityId: e.opportunityId,
      changeType: e.changeType,
      summary: e.description,
    }));

    const rising = this.monitor.rising().map((s) => s.opportunityId);
    const falling = this.monitor.falling().map((s) => s.opportunityId);

    const calibration = this.learning.getCalibration();

    const sections: ReportSection[] = [
      {
        title: "Champion",
        content: champion
          ? `Champion: ${champion.opportunityId} (score=${champion.score.toFixed(3)}, wins=${champion.tournamentWins})`
          : "No champion yet.",
        highlights: champion ? [`Score: ${champion.score.toFixed(3)}`] : [],
      },
      {
        title: "Market Summary",
        content: buildMarketSummary(newOpps.length, lostOpps.length, recentChanges),
        highlights: [],
      },
      {
        title: "Learning",
        content: `Accuracy: ${(calibration.accuracyRate * 100).toFixed(1)}% across ${calibration.resolvedPredictions} resolved predictions.`,
        highlights: [],
      },
    ];

    const report: DailyReport = {
      reportId: generateId("daily"),
      date,
      generatedAt: nowIso(),
      champion,
      top10,
      newOpportunities: newOpps,
      lostOpportunities: lostOpps,
      changedOpportunities: changedOpps,
      rejectedOpportunities: lostOpps,
      highestGrowth: rising.slice(0, 5),
      highestRisk: falling.slice(0, 5),
      marketSummary: buildMarketSummary(newOpps.length, lostOpps.length, recentChanges),
      learningSummary: `Accuracy=${(calibration.accuracyRate * 100).toFixed(1)}%`,
      sections,
    };

    this.audit.log("report-generated", { reportId: report.reportId, type: "daily", date }, null, "report");
    return report;
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildMarketSummary(newCount: number, lostCount: number, changes: ChangeEvent[]): string {
  const changeTypes = [...new Set(changes.map((c) => c.changeType))].join(", ");
  return `+${newCount} new, -${lostCount} archived. Changes detected: ${changeTypes || "none"}.`;
}
