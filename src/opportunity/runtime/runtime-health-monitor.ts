import { nowIso } from "../../utils/id.js";
import type { HealthStatus, HealthStatusCode, ComponentHealth } from "./types.js";
import type { Scheduler } from "./scheduler.js";
import type { QueueManager } from "./queue-manager.js";
import type { MetricsEngine } from "./metrics-engine.js";
import type { AuditLog } from "./audit-log.js";

// ---------------------------------------------------------------------------
// Runtime Health Monitor — pipeline health checks for all components
// ---------------------------------------------------------------------------

export class RuntimeHealthMonitor {
  constructor(
    private readonly scheduler: Scheduler,
    private readonly queue: QueueManager,
    private readonly metrics: MetricsEngine,
    private readonly audit: AuditLog,
  ) {}

  check(): HealthStatus {
    const components: ComponentHealth[] = [
      this.checkScheduler(),
      this.checkQueue(),
      this.checkMetrics(),
      this.checkAuditLog(),
    ];

    const overall = deriveOverall(components.map((c) => c.status));

    return { overall, components, checkedAt: nowIso() };
  }

  private checkScheduler(): ComponentHealth {
    const tasks = this.scheduler.getAll();
    const enabled = tasks.filter((t) => t.enabled);
    const now = Date.now();

    const overdue = enabled.filter((t) => {
      const lag = now - new Date(t.nextRunAt).getTime();
      return lag > 30 * 60 * 1000;  // 30 min overdue
    });

    let status: HealthStatusCode = "healthy";
    let message = `${enabled.length} tasks enabled`;
    if (overdue.length > 0) {
      status = overdue.length >= enabled.length / 2 ? "critical" : "degraded";
      message = `${overdue.length} tasks overdue by >30min`;
    }

    return { name: "scheduler", status, message, lastCheckedAt: nowIso() };
  }

  private checkQueue(): ComponentHealth {
    const pending = this.queue.pendingCount();
    const running = this.queue.runningCount();
    const failed = this.queue.failedJobs().length;

    let status: HealthStatusCode = "healthy";
    let message = `pending=${pending} running=${running} failed=${failed}`;

    if (failed > 10) {
      status = "critical";
      message = `${failed} permanently failed jobs`;
    } else if (pending > 100) {
      status = "degraded";
      message = `Queue backlog: ${pending} pending jobs`;
    }

    return { name: "queue", status, message, lastCheckedAt: nowIso() };
  }

  private checkMetrics(): ComponentHealth {
    const snap = this.metrics.snapshot();
    let status: HealthStatusCode = "healthy";
    let message = `runs=${snap.totalPipelineRuns} failRate=${(snap.failureRate * 100).toFixed(1)}%`;

    if (snap.failureRate > 0.5) {
      status = "critical";
      message = `High failure rate: ${(snap.failureRate * 100).toFixed(1)}%`;
    } else if (snap.failureRate > 0.2) {
      status = "degraded";
      message = `Elevated failure rate: ${(snap.failureRate * 100).toFixed(1)}%`;
    }

    return { name: "metrics", status, message, lastCheckedAt: nowIso() };
  }

  private checkAuditLog(): ComponentHealth {
    const size = this.audit.size();
    return {
      name: "audit-log",
      status: "healthy",
      message: `${size} entries`,
      lastCheckedAt: nowIso(),
    };
  }
}

function deriveOverall(statuses: HealthStatusCode[]): HealthStatusCode {
  if (statuses.includes("critical")) return "critical";
  if (statuses.includes("degraded")) return "degraded";
  if (statuses.every((s) => s === "healthy")) return "healthy";
  return "unknown";
}
