import { generateId, nowIso } from "../../utils/id.js";
import type { MonthlyReport, ReportSection } from "./types.js";
import type { ChampionTournament } from "./champion-tournament.js";
import type { HistoricalLearningEngine } from "./historical-learning-engine.js";
import type { MetricsEngine } from "./metrics-engine.js";
import type { ChangeDetectionEngine } from "./change-detection-engine.js";
import type { AuditLog } from "./audit-log.js";

// ---------------------------------------------------------------------------
// Monthly Report Engine — monthly founder report
// ---------------------------------------------------------------------------

export class MonthlyReportEngine {
  constructor(
    private readonly tournament: ChampionTournament,
    private readonly learning: HistoricalLearningEngine,
    private readonly metrics: MetricsEngine,
    private readonly changeDetection: ChangeDetectionEngine,
    private readonly audit: AuditLog,
  ) {}

  generate(): MonthlyReport {
    const monthMs = 30 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const champion = this.tournament.getChampion();
    const lastResult = this.tournament.lastResult();
    const top10 = lastResult
      ? lastResult.rankings.slice(0, 10).map((r) => {
          const champ = this.tournament.getChampion();
          return champ && champ.opportunityId === r.opportunityId ? champ : null;
        }).filter((c): c is NonNullable<typeof c> => c !== null)
      : champion ? [champion] : [];

    const snap = this.metrics.snapshot();
    const calibration = this.learning.getCalibration();
    const recentChanges = this.changeDetection.recentEvents(monthMs);

    const history = this.tournament.getHistory();
    const championEvolution = history
      .filter((r) => r.championChanged)
      .map((r) => ({ opportunityId: r.champion.opportunityId, since: r.ranAt }));

    const marketEvolution = buildMarketEvolution(recentChanges.map((c) => c.changeType));

    const sections: ReportSection[] = [
      {
        title: "Month in Review",
        content: `${snap.totalPipelineRuns} pipeline runs. ${snap.tournamentRuns} tournaments. ${snap.championChanges} champion changes. ${snap.totalBlueprints} blueprints.`,
        highlights: [
          `Pipeline runs: ${snap.totalPipelineRuns}`,
          `Blueprints generated: ${snap.totalBlueprints}`,
          `Notifications sent: ${snap.notificationsSent}`,
        ],
      },
      {
        title: "Champion Evolution",
        content: championEvolution.length > 0
          ? championEvolution.map((e) => `${e.opportunityId} (since ${e.since.slice(0, 10)})`).join(", ")
          : "Champion unchanged this month.",
        highlights: [],
      },
      {
        title: "Market Evolution",
        content: marketEvolution,
        highlights: [],
      },
      {
        title: "Learning Progress",
        content: `Accuracy: ${(calibration.accuracyRate * 100).toFixed(1)}%. Calibration error: ${calibration.confidenceCalibrationError.toFixed(3)}.`,
        highlights: [
          `Accuracy: ${(calibration.accuracyRate * 100).toFixed(1)}%`,
          `Calibration error: ${calibration.confidenceCalibrationError.toFixed(3)}`,
        ],
      },
    ];

    const report: MonthlyReport = {
      reportId: generateId("monthly"),
      monthYear,
      generatedAt: nowIso(),
      champion,
      top10,
      totalPipelineRuns: snap.totalPipelineRuns,
      totalSignalsProcessed: snap.totalSignalsCollected,
      totalOpportunitiesEvaluated: snap.totalOpportunitiesProcessed,
      totalBlueprints: snap.totalBlueprints,
      championEvolution,
      monthOverMonthGrowth: snap.avgConfidence,
      marketEvolution,
      learningProgress: calibration,
      sections,
    };

    this.audit.log("report-generated", { reportId: report.reportId, type: "monthly", monthYear }, null, "report");
    return report;
  }
}

function buildMarketEvolution(changeTypes: string[]): string {
  const counts: Record<string, number> = {};
  for (const t of changeTypes) counts[t] = (counts[t] ?? 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return "No significant market changes this month.";
  return sorted.map(([t, n]) => `${t} ×${n}`).join(", ");
}
