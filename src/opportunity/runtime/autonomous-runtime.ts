import { generateId, nowIso } from "../../utils/id.js";
import type { Opportunity } from "../types.js";
import type { PipelineResult, TournamentResult, DashboardState, DailyReport, WeeklyReport, MonthlyReport } from "./types.js";

import { AuditLog } from "./audit-log.js";
import { Scheduler } from "./scheduler.js";
import { QueueManager } from "./queue-manager.js";
import { ParallelExecutor } from "./parallel-executor.js";
import { PipelineOrchestrator } from "./pipeline-orchestrator.js";
import { OpportunityMonitor } from "./opportunity-monitor.js";
import { OpportunityArchive } from "./opportunity-archive.js";
import { ChampionTournament } from "./champion-tournament.js";
import { ChangeDetectionEngine } from "./change-detection-engine.js";
import { HistoricalLearningEngine } from "./historical-learning-engine.js";
import { PredictionValidationEngine } from "./prediction-validation-engine.js";
import { FounderDashboardEngine } from "./founder-dashboard-engine.js";
import { DailyReportEngine } from "./daily-report-engine.js";
import { WeeklyReportEngine } from "./weekly-report-engine.js";
import { MonthlyReportEngine } from "./monthly-report-engine.js";
import { NotificationEngine } from "./notification-engine.js";
import { MemoryUpdater } from "./memory-updater.js";
import { KnowledgeUpdater } from "./knowledge-updater.js";
import { MetricsEngine } from "./metrics-engine.js";
import { RuntimeHealthMonitor } from "./runtime-health-monitor.js";
import { FailureRecovery } from "./failure-recovery.js";

// ---------------------------------------------------------------------------
// Autonomous Runtime — main class tying all 22 components together
// ---------------------------------------------------------------------------

export interface RuntimeConfig {
  parallelism?: number;
}

export class AutonomousRuntime {
  readonly audit: AuditLog;
  readonly scheduler: Scheduler;
  readonly queue: QueueManager;
  readonly executor: ParallelExecutor;
  readonly pipeline: PipelineOrchestrator;
  readonly monitor: OpportunityMonitor;
  readonly archive: OpportunityArchive;
  readonly tournament: ChampionTournament;
  readonly changeDetection: ChangeDetectionEngine;
  readonly learning: HistoricalLearningEngine;
  readonly predictionValidation: PredictionValidationEngine;
  readonly dashboard: FounderDashboardEngine;
  readonly dailyReport: DailyReportEngine;
  readonly weeklyReport: WeeklyReportEngine;
  readonly monthlyReport: MonthlyReportEngine;
  readonly notifications: NotificationEngine;
  readonly memory: MemoryUpdater;
  readonly knowledge: KnowledgeUpdater;
  readonly metrics: MetricsEngine;
  readonly health: RuntimeHealthMonitor;
  readonly recovery: FailureRecovery;

  private readonly taskIds: Record<string, string> = {};

  constructor(config: RuntimeConfig = {}) {
    // Layer 1: Stateless infra
    this.audit = new AuditLog();
    this.scheduler = new Scheduler();
    this.queue = new QueueManager();
    this.executor = new ParallelExecutor(config.parallelism ?? 4);
    this.metrics = new MetricsEngine();

    // Layer 2: State stores
    this.monitor = new OpportunityMonitor(this.audit);
    this.archive = new OpportunityArchive(this.audit);
    this.tournament = new ChampionTournament(this.audit);

    // Layer 3: Recovery
    this.recovery = new FailureRecovery(this.queue, this.audit);

    // Layer 4: Health (needs scheduler, queue, metrics, audit)
    this.health = new RuntimeHealthMonitor(this.scheduler, this.queue, this.metrics, this.audit);

    // Layer 5: Intelligence engines
    this.changeDetection = new ChangeDetectionEngine(this.audit);
    this.learning = new HistoricalLearningEngine(this.audit);
    this.predictionValidation = new PredictionValidationEngine(this.audit);

    // Layer 6: Pipeline
    this.pipeline = new PipelineOrchestrator(this.executor, this.archive, this.monitor, this.audit);

    // Layer 7: Knowledge / memory
    this.memory = new MemoryUpdater(this.audit);
    this.knowledge = new KnowledgeUpdater(this.audit);

    // Layer 8: Notifications
    this.notifications = new NotificationEngine(this.audit);

    // Layer 9: Reporting (needs everything above)
    this.dashboard = new FounderDashboardEngine(this.tournament, this.monitor, this.archive, this.health);
    this.dailyReport = new DailyReportEngine(this.tournament, this.monitor, this.archive, this.changeDetection, this.learning, this.audit);
    this.weeklyReport = new WeeklyReportEngine(this.tournament, this.monitor, this.archive, this.changeDetection, this.learning, this.metrics, this.audit);
    this.monthlyReport = new MonthlyReportEngine(this.tournament, this.learning, this.metrics, this.changeDetection, this.audit);

    this.registerScheduledTasks();
  }

  // -------------------------------------------------------------------------
  // Main entry point — call this on every tick (e.g. every minute)
  // -------------------------------------------------------------------------

  async tick(opportunities: Opportunity[]): Promise<{
    pipelineResult: PipelineResult | null;
    tournamentResult: TournamentResult | null;
  }> {
    const due = this.scheduler.getDue();
    let pipelineResult: PipelineResult | null = null;
    let tournamentResult: TournamentResult | null = null;

    for (const task of due) {
      this.scheduler.markStarted(task.id);
      try {
        if (task.name === "collect-and-score" && opportunities.length > 0) {
          pipelineResult = await this.runCollectCycle(opportunities);
        } else if (task.name === "rescore-and-tournament") {
          tournamentResult = await this.runHourlyCycle(opportunities);
        } else if (task.name === "refresh-market") {
          await this.runSixHourCycle(opportunities);
        } else if (task.name === "daily-report") {
          this.runDailyCycle();
        }
        this.scheduler.markCompleted(task.id);
      } catch (err) {
        this.scheduler.markFailed(task.id);
        this.audit.log("failure-recovered", {
          task: task.name,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    this.recovery.recoverQueueFailures();

    return { pipelineResult, tournamentResult };
  }

  // -------------------------------------------------------------------------
  // Every 10 minutes — collect, score, court, blueprint
  // -------------------------------------------------------------------------

  async runCollectCycle(opportunities: Opportunity[]): Promise<PipelineResult> {
    const { result, outputs } = await this.pipeline.runBatch(opportunities);

    for (const out of outputs) {
      if (out.archived) continue;

      // Change detection
      const changes = this.changeDetection.detect(out.intelligence);

      // Notifications for changes
      for (const change of changes) {
        const prevConf = this.monitor.get(out.opportunityId)?.history.at(-2)?.score ?? out.intelligence.overallConfidence;
        this.notifications.onMajorMarketChange(change);
        this.notifications.onMajorCompetitionChange(change);
        this.notifications.onMajorCostChange(change);
        this.notifications.onMajorRevenueChange(change);
        this.notifications.onMajorLegalChange(change);
        this.notifications.onConfidenceChange(out.intelligence, prevConf);
      }

      // Invalidation check
      if (out.intelligence.rejected) {
        this.notifications.onOpportunityInvalidated(out.intelligence, out.intelligence.rejectionReasons[0] ?? "rejected");
      }

      // Memory + knowledge
      this.memory.updateOpportunity(out.intelligence);
      this.memory.updateDecision(out.decision);
      this.memory.updateBlueprint(out.blueprint);
      this.knowledge.indexOpportunity(out.intelligence, out.decision);
      for (const ch of changes) this.knowledge.indexChangeEvent(ch);

      // Predictions
      this.predictionValidation.record(out.opportunityId, out.intelligence.overallConfidence, out.decision.verdict);
      this.learning.createRecord(out.opportunityId, out.decision.verdict, out.decision.confidence);

      // Metrics
      this.metrics.recordConfidence(out.intelligence.overallConfidence);
      this.metrics.recordBlueprint();
    }

    this.metrics.recordPipelineRun(result);
    this.audit.log("pipeline-run", { runId: result.runId, processed: result.opportunitiesProcessed }, result.runId, "pipeline");

    return result;
  }

  // -------------------------------------------------------------------------
  // Every hour — rescore, tournament, archive weak
  // -------------------------------------------------------------------------

  async runHourlyCycle(opportunities: Opportunity[]): Promise<TournamentResult | null> {
    if (opportunities.length === 0) return null;

    const { outputs } = await this.pipeline.runBatch(opportunities);
    const entrants = outputs
      .filter((o) => !o.archived)
      .map((o) => ({ intelligence: o.intelligence, decision: o.decision, blueprint: o.blueprint }));

    if (entrants.length === 0) return null;

    const result = this.tournament.run(entrants);
    this.metrics.recordTournament();

    if (result.championChanged) {
      const prevId = result.previousChampionId;
      if (prevId) {
        this.notifications.onChampionReplaced(result);
      } else {
        this.notifications.onNewChampion(result.champion);
      }
      this.memory.updateChampion(result.champion);
      this.metrics.recordChampionChange();
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Every 6 hours — refresh market intelligence
  // -------------------------------------------------------------------------

  async runSixHourCycle(opportunities: Opportunity[]): Promise<void> {
    // Re-run pipeline with full market refresh (same as collect cycle in this impl)
    if (opportunities.length > 0) {
      await this.runCollectCycle(opportunities);
    }
  }

  // -------------------------------------------------------------------------
  // Every day — generate founder report
  // -------------------------------------------------------------------------

  runDailyCycle(): DailyReport {
    const report = this.dailyReport.generate();
    this.audit.log("report-generated", { reportId: report.reportId, type: "daily" }, null, "report");
    return report;
  }

  // -------------------------------------------------------------------------
  // On-demand report generation
  // -------------------------------------------------------------------------

  getDashboard(): DashboardState {
    return this.dashboard.generate();
  }

  getWeeklyReport(): WeeklyReport {
    return this.weeklyReport.generate();
  }

  getMonthlyReport(): MonthlyReport {
    return this.monthlyReport.generate();
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private registerScheduledTasks(): void {
    const t1 = this.scheduler.register("collect-and-score", "10min");
    const t2 = this.scheduler.register("rescore-and-tournament", "1hr");
    const t3 = this.scheduler.register("refresh-market", "6hr");
    const t4 = this.scheduler.register("daily-report", "1day");
    this.taskIds["collect"] = t1.id;
    this.taskIds["hourly"] = t2.id;
    this.taskIds["sixhr"] = t3.id;
    this.taskIds["daily"] = t4.id;
  }
}
