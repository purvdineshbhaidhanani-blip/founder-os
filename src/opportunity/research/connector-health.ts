import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { CollectorSource } from "../types.js";
import type { SourceStats } from "./types.js";

// ---------------------------------------------------------------------------
// Connector Health Tracker
// Persists per-source health stats across all research sessions.
// Stored at .founder-os/connector-health.json
// ---------------------------------------------------------------------------

export type ConnectorStatus = "healthy" | "degraded" | "failing" | "unknown";

export interface ConnectorHealthRecord {
  source: CollectorSource;
  status: ConnectorStatus;
  lastSuccessfulRun: string | null;
  lastFailure: string | null;
  lastError: string | null;
  totalRuns: number;
  successRuns: number;
  failureRuns: number;
  totalItemsCollected: number;
  avgDurationMs: number;
  retryCount: number;
  updatedAt: string;
}

type HealthMap = Partial<Record<CollectorSource, ConnectorHealthRecord>>;

export class ConnectorHealthTracker {
  private readonly path: string;
  private readonly dir: string;
  private health: HealthMap = {};

  constructor(cwd: string = process.cwd()) {
    this.dir = join(cwd, ".founder-os");
    this.path = join(this.dir, "connector-health.json");
    this.load();
  }

  update(sourceStats: SourceStats[], sessionAt: string = new Date().toISOString()): void {
    for (const stats of sourceStats) {
      const prev = this.health[stats.source] ?? this.defaultRecord(stats.source);
      const failed = stats.errors.length > 0 && stats.itemsCollected === 0;
      const lastError = failed
        ? (stats.errors[0]?.message ?? "unknown error")
        : prev.lastError;

      const newTotalRuns = prev.totalRuns + 1;
      const newSuccessRuns = failed ? prev.successRuns : prev.successRuns + 1;
      const newFailureRuns = failed ? prev.failureRuns + 1 : prev.failureRuns;
      const newTotalItems = prev.totalItemsCollected + stats.itemsCollected;
      // Running average duration
      const newAvgDuration = prev.totalRuns === 0
        ? stats.durationMs
        : Math.round((prev.avgDurationMs * prev.totalRuns + stats.durationMs) / newTotalRuns);

      const recentFailureRate = newTotalRuns > 0 ? newFailureRuns / newTotalRuns : 0;

      const updated: ConnectorHealthRecord = {
        source: stats.source,
        status: deriveStatus(recentFailureRate, failed),
        lastSuccessfulRun: failed ? prev.lastSuccessfulRun : sessionAt,
        lastFailure: failed ? sessionAt : prev.lastFailure,
        lastError,
        totalRuns: newTotalRuns,
        successRuns: newSuccessRuns,
        failureRuns: newFailureRuns,
        totalItemsCollected: newTotalItems,
        avgDurationMs: newAvgDuration,
        retryCount: stats.errors.length > 0 ? (prev.retryCount + 1) : prev.retryCount,
        updatedAt: sessionAt,
      };
      this.health[stats.source] = updated;
    }
    this.save();
  }

  getHealth(source: CollectorSource): ConnectorHealthRecord {
    return this.health[source] ?? this.defaultRecord(source);
  }

  getAll(): ConnectorHealthRecord[] {
    return Object.values(this.health) as ConnectorHealthRecord[];
  }

  private load(): void {
    if (!existsSync(this.path)) return;
    try {
      this.health = JSON.parse(readFileSync(this.path, "utf8")) as HealthMap;
    } catch {
      this.health = {};
    }
  }

  private save(): void {
    try {
      mkdirSync(this.dir, { recursive: true });
      writeFileSync(this.path, JSON.stringify(this.health, null, 2), "utf8");
    } catch {
      // non-fatal
    }
  }

  private defaultRecord(source: CollectorSource): ConnectorHealthRecord {
    return {
      source,
      status: "unknown",
      lastSuccessfulRun: null,
      lastFailure: null,
      lastError: null,
      totalRuns: 0,
      successRuns: 0,
      failureRuns: 0,
      totalItemsCollected: 0,
      avgDurationMs: 0,
      retryCount: 0,
      updatedAt: new Date().toISOString(),
    };
  }
}

function deriveStatus(failureRate: number, lastFailed: boolean): ConnectorStatus {
  if (failureRate >= 0.8) return "failing";
  if (lastFailed || failureRate >= 0.4) return "degraded";
  if (failureRate === 0) return "healthy";
  return "degraded";
}
