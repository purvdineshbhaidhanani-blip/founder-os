import { nowIso } from "../../utils/id.js";
import type { RuntimeMetrics, PipelineResult } from "./types.js";

// ---------------------------------------------------------------------------
// Metrics Engine — runtime performance metrics
// ---------------------------------------------------------------------------

export class MetricsEngine {
  private metrics: RuntimeMetrics = {
    totalPipelineRuns: 0,
    totalOpportunitiesProcessed: 0,
    totalSignalsCollected: 0,
    totalBlueprints: 0,
    avgPipelineDurationMs: 0,
    failureRate: 0,
    retryRate: 0,
    avgConfidence: 0,
    championChanges: 0,
    tournamentRuns: 0,
    notificationsSent: 0,
    lastUpdated: nowIso(),
  };

  private pipelineDurations: number[] = [];
  private pipelineFailures = 0;
  private pipelineRetries = 0;
  private confidenceSamples: number[] = [];

  recordPipelineRun(result: PipelineResult, failed = false): void {
    this.metrics.totalPipelineRuns++;
    this.metrics.totalOpportunitiesProcessed += result.opportunitiesProcessed;
    this.pipelineDurations.push(result.durationMs);
    this.metrics.avgPipelineDurationMs = avg(this.pipelineDurations);
    if (failed) this.pipelineFailures++;
    this.metrics.failureRate = this.pipelineFailures / this.metrics.totalPipelineRuns;
    this.refresh();
  }

  recordRetry(): void {
    this.pipelineRetries++;
    const total = this.metrics.totalPipelineRuns || 1;
    this.metrics.retryRate = this.pipelineRetries / total;
    this.refresh();
  }

  recordSignals(count: number): void {
    this.metrics.totalSignalsCollected += count;
    this.refresh();
  }

  recordBlueprint(): void {
    this.metrics.totalBlueprints++;
    this.refresh();
  }

  recordConfidence(confidence: number): void {
    this.confidenceSamples.push(confidence);
    this.metrics.avgConfidence = avg(this.confidenceSamples);
    this.refresh();
  }

  recordChampionChange(): void {
    this.metrics.championChanges++;
    this.refresh();
  }

  recordTournament(): void {
    this.metrics.tournamentRuns++;
    this.refresh();
  }

  recordNotification(): void {
    this.metrics.notificationsSent++;
    this.refresh();
  }

  snapshot(): RuntimeMetrics {
    return { ...this.metrics };
  }

  private refresh(): void {
    this.metrics.lastUpdated = nowIso();
  }
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}
