import { generateId, nowIso } from "../utils/id.js";
import type { Timestamp } from "../types/common.js";
import type { EventBus } from "../runtime/events/bus.js";
import type { TaskQueue } from "../runtime/queue/queue.js";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogRecord {
  timestamp: Timestamp;
  level: LogLevel;
  scope: string;
  message: string;
  payload?: Record<string, unknown>;
}

export interface MetricPoint {
  name: string;
  value: number;
  timestamp: Timestamp;
  tags?: Record<string, string>;
}

export interface HealthCheck {
  id: string;
  name: string;
  ok: boolean;
  checkedAt: Timestamp;
  message?: string;
}

export interface AuditRecord {
  id: string;
  actor: string;
  action: string;
  target?: string;
  details?: Record<string, unknown>;
  timestamp: Timestamp;
}

export interface ObservabilityOptions {
  bus?: EventBus;
  queue?: TaskQueue;
  logLimit?: number;
  metricsLimit?: number;
  auditLimit?: number;
}

/**
 * Phase 13 surface — Observability. Aggregates logs, metrics, health checks
 * and audit records for the entire OS. Designed as a single read-only pane
 * the Command Center backend mirrors directly into dashboards.
 */
export class ObservabilityHub {
  private logs: LogRecord[] = [];
  private metrics: MetricPoint[] = [];
  private health = new Map<string, HealthCheck>();
  private auditRecords: AuditRecord[] = [];
  private readonly logLimit: number;
  private readonly metricsLimit: number;
  private readonly auditLimit: number;
  private readonly bus?: EventBus;
  private readonly queue?: TaskQueue;

  constructor(options: ObservabilityOptions = {}) {
    this.logLimit = options.logLimit ?? 10_000;
    this.metricsLimit = options.metricsLimit ?? 10_000;
    this.auditLimit = options.auditLimit ?? 10_000;
    this.bus = options.bus;
    this.queue = options.queue;
  }

  log(level: LogLevel, scope: string, message: string, payload?: Record<string, unknown>): LogRecord {
    const record: LogRecord = { timestamp: nowIso(), level, scope, message, payload };
    this.logs.push(record);
    if (this.logs.length > this.logLimit) this.logs.shift();
    return record;
  }

  metric(name: string, value: number, tags?: Record<string, string>): MetricPoint {
    const point: MetricPoint = { name, value, timestamp: nowIso(), tags };
    this.metrics.push(point);
    if (this.metrics.length > this.metricsLimit) this.metrics.shift();
    return point;
  }

  recordHealth(name: string, ok: boolean, message?: string): HealthCheck {
    const check: HealthCheck = { id: name, name, ok, message, checkedAt: nowIso() };
    this.health.set(name, check);
    return check;
  }

  audit(actor: string, action: string, target?: string, details?: Record<string, unknown>): AuditRecord {
    const record: AuditRecord = { id: generateId("audit"), actor, action, target, details, timestamp: nowIso() };
    this.auditRecords.push(record);
    if (this.auditRecords.length > this.auditLimit) this.auditRecords.shift();
    return record;
  }

  recentLogs(filter?: { level?: LogLevel; scope?: string }, limit = 200): LogRecord[] {
    let out = this.logs;
    if (filter?.level) out = out.filter((log) => log.level === filter.level);
    if (filter?.scope) out = out.filter((log) => log.scope === filter.scope);
    return out.slice(-limit);
  }

  metricsByName(name: string, limit = 200): MetricPoint[] {
    return this.metrics.filter((point) => point.name === name).slice(-limit);
  }

  healthChecks(): HealthCheck[] { return [...this.health.values()]; }

  auditLog(filter?: { actor?: string; action?: string }, limit = 200): AuditRecord[] {
    let out = this.auditRecords;
    if (filter?.actor) out = out.filter((entry) => entry.actor === filter.actor);
    if (filter?.action) out = out.filter((entry) => entry.action === filter.action);
    return out.slice(-limit);
  }

  /** Cost + token rollup over the recorded metrics. */
  costSummary(): { totalCents: number; totalTokens: number } {
    let cents = 0;
    let tokens = 0;
    for (const point of this.metrics) {
      if (point.name === "cost.cents") cents += point.value;
      if (point.name === "tokens") tokens += point.value;
    }
    return { totalCents: cents, totalTokens: tokens };
  }

  /** Snapshot of queue throughput at the moment of call. */
  queueSnapshot(): { queued: number; running: number; succeeded: number; failed: number; dead: number } {
    if (!this.queue) return { queued: 0, running: 0, succeeded: 0, failed: 0, dead: 0 };
    return {
      queued: this.queue.list({ statuses: ["queued", "scheduled"] }).length,
      running: this.queue.list({ status: "running" }).length,
      succeeded: this.queue.list({ status: "succeeded" }).length,
      failed: this.queue.list({ status: "failed" }).length,
      dead: this.queue.list({ status: "dead" }).length,
    };
  }

  /** Aggregate health: all checks must be ok. */
  overallHealth(): { ok: boolean; failing: string[] } {
    const failing = [...this.health.values()].filter((check) => !check.ok).map((check) => check.name);
    return { ok: failing.length === 0, failing };
  }

  attachBus(): void {
    if (!this.bus) return;
    this.bus.subscribe({ namePattern: "^task\\." }, (event) => {
      this.metric(`event.${event.name}`, 1, { source: event.source ?? "" });
    });
    this.bus.subscribe({ namePattern: "^workflow\\." }, (event) => {
      this.metric(`event.${event.name}`, 1);
    });
  }
}
