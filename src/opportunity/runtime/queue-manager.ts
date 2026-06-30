import { generateId, nowIso } from "../../utils/id.js";
import type { QueueJob, JobPriority, JobStatus } from "./types.js";

// ---------------------------------------------------------------------------
// Queue Manager — priority job queue with retry tracking
// ---------------------------------------------------------------------------

const PRIORITY_WEIGHT: Record<JobPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

export class QueueManager {
  private readonly jobs = new Map<string, QueueJob<unknown>>();

  enqueue<T>(type: string, payload: T, priority: JobPriority = "normal", maxAttempts = 3): QueueJob<T> {
    const job: QueueJob<T> = {
      id: generateId("job"),
      type,
      priority,
      payload,
      status: "pending",
      attempts: 0,
      maxAttempts,
      enqueuedAt: nowIso(),
      startedAt: null,
      completedAt: null,
      error: null,
    };
    this.jobs.set(job.id, job as QueueJob<unknown>);
    return job;
  }

  dequeue(count = 1): QueueJob<unknown>[] {
    const pending = [...this.jobs.values()]
      .filter((j) => j.status === "pending")
      .sort((a, b) => {
        const pw = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
        if (pw !== 0) return pw;
        return new Date(a.enqueuedAt).getTime() - new Date(b.enqueuedAt).getTime();
      });

    const batch = pending.slice(0, count);
    for (const job of batch) {
      job.status = "running";
      job.startedAt = nowIso();
      job.attempts++;
    }
    return batch;
  }

  complete(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = "done";
    job.completedAt = nowIso();
  }

  fail(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.error = error;
    if (job.attempts < job.maxAttempts) {
      job.status = "retrying";
    } else {
      job.status = "failed";
      job.completedAt = nowIso();
    }
  }

  requeueRetrying(): number {
    let count = 0;
    for (const job of this.jobs.values()) {
      if (job.status === "retrying") {
        job.status = "pending";
        count++;
      }
    }
    return count;
  }

  pendingCount(): number {
    return [...this.jobs.values()].filter((j) => j.status === "pending" || j.status === "retrying").length;
  }

  runningCount(): number {
    return [...this.jobs.values()].filter((j) => j.status === "running").length;
  }

  failedJobs(): QueueJob<unknown>[] {
    return [...this.jobs.values()].filter((j) => j.status === "failed");
  }

  byType(type: string): QueueJob<unknown>[] {
    return [...this.jobs.values()].filter((j) => j.type === type);
  }

  clear(status?: JobStatus): void {
    if (!status) {
      this.jobs.clear();
      return;
    }
    for (const [id, job] of this.jobs) {
      if (job.status === status) this.jobs.delete(id);
    }
  }

  size(): number {
    return this.jobs.size;
  }
}
