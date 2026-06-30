import { generateId, nowIso } from "../../utils/id.js";
import type { WeeklyReport, ReportSection } from "./types.js";
import type { ChampionTournament } from "./champion-tournament.js";
import type { OpportunityMonitor } from "./opportunity-monitor.js";
import type { OpportunityArchive } from "./opportunity-archive.js";
import type { ChangeDetectionEngine } from "./change-detection-engine.js";
import type { HistoricalLearningEngine } from "./historical-learning-engine.js";
import type { MetricsEngine } from "./metrics-engine.js";
import type { AuditLog } from "./audit-log.js";

// ---------------------------------------------------------------------------
// Weekly Report Engine — weekly founder report
// ---------------------------------------------------------------------------

export class WeeklyReportEngine {
  constructor(
    private readonly tournament: ChampionTournament,
    private readonly monitor: OpportunityMonitor,
    private readonly archive: OpportunityArchive,
    private readonly changeDetection: ChangeDetectionEngine,
    private readonly learning: HistoricalLearningEngine,
    private readonly metrics: MetricsEngine,
    private readonly audit: AuditLog,
  ) {}

  generate(): WeeklyReport {
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const weekStartDate = new Date(now.getTime() - weekMs).toISOString().slice(0, 10);
    const weekEndDate = now.toISOString().slice(0, 10);

    const champion = this.tournament.getChampion();
    const lastResult = this.tournament.lastResult();
    const top10 = lastResult
      ? lastResult.rankings.slice(0, 10).map((r) => {
          const champ = this.tournament.getChampion();
          return champ && champ.opportunityId === r.opportunityId ? champ : null;
        }).filter((c): c is NonNullable<typeof c> => c !== null)
      : champion ? [champion] : [];

    const snap = this.metrics.snapshot();
    const recentChanges = this.changeDetection.recentEvents(weekMs);
    const calibration = this.learning.getCalibration();

    const allStates = this.monitor.all();
    const prevAvg = allStates.length > 0
      ? allStates.reduce((s, st) => s + st.lowestScore, 0) / allStates.length
      : 0;
    const currAvg = allStates.length > 0
      ? allStates.reduce((s, st) => s + st.currentScore, 0) / allStates.length
      : 0;
    const weekOverWeekGrowth = prevAvg > 0 ? (currAvg - prevAvg) / prevAvg : 0;

    const marketTrends = [...new Set(recentChanges.map((c) => c.changeType))];
    const learningInsights = [
      `Accuracy: ${(calibration.accuracyRate * 100).toFixed(1)}%`,
      `Calibration error: ${calibration.confidenceCalibrationError.toFixed(3)}`,
      `Resolved predictions: ${calibration.resolvedPredictions}`,
    ];

    const sections: ReportSection[] = [
      {
        title: "Week in Review",
        content: `${snap.totalPipelineRuns} pipeline runs. ${snap.totalOpportunitiesProcessed} opportunities processed. ${this.tournament.championChanges()} champion changes.`,
        highlights: [
          `Pipeline runs: ${snap.totalPipelineRuns}`,
          `Champion changes: ${this.tournament.championChanges()}`,
          `Avg confidence: ${(snap.avgConfidence * 100).toFixed(1)}%`,
        ],
      },
      {
        title: "Top Changes",
        content: recentChanges.slice(0, 5).map((e) => e.description).join(". ") || "No significant changes.",
        highlights: marketTrends.slice(0, 3),
      },
      {
        title: "Learning Progress",
        content: learningInsights.join(" | "),
        highlights: learningInsights,
      },
    ];

    const report: WeeklyReport = {
      reportId: generateId("weekly"),
      weekStartDate,
      weekEndDate,
      generatedAt: nowIso(),
      champion,
      top10,
      pipelineRunCount: snap.totalPipelineRuns,
      totalOpportunitiesEvaluated: snap.totalOpportunitiesProcessed,
      totalOpportunitiesArchived: this.archive.recentlyArchived(weekMs).length,
      championChanges: this.tournament.championChanges(),
      topChangeEvents: recentChanges.slice(0, 10),
      weekOverWeekGrowth,
      marketTrends,
      learningInsights,
      sections,
    };

    this.audit.log("report-generated", {
      reportId: report.reportId, type: "weekly", weekStartDate, weekEndDate,
    }, null, "report");

    return report;
  }
}
