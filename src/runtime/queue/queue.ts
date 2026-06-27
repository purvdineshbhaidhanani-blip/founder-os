import { generateId, nowIso } from "../../utils/id.js";
import type {
  RetryPolicy,
  TaskDefinition,
  TaskFilter,
  TaskRecord,
  TaskStatus,
} from "./types.js";

const TERMINAL_SUCCESS: TaskStatus[] = ["succeeded"];
const DEFAULT_RETRY: RetryPolicy = { maxAttempts: 1, backoffMs: 1_000 };

export interface TaskQueueOptions {
  /** Override the default retry policy applied when an enqueued task does not specify one. */
  defaultRetry?: RetryPolicy;
}

/**
 * Phase 3 surface — priority queue with dependency-aware scheduling, retry/
 * backoff, cancellation, per-task timeout metadata, and a dead-letter sink.
 * The queue itself is pure data; execution is left to higher layers (Phase 9).
 */
export class TaskQueue {
  private readonly tasks = new Map<string, TaskRecord>();
  private readonly defaultRetry: RetryPolicy;

  constructor(options: TaskQueueOptions = {}) {
    this.defaultRetry = options.defaultRetry ?? DEFAULT_RETRY;
  }

  enqueue<T>(def: TaskDefinition<T>): TaskRecord<T> {
    const id = def.id ?? generateId("task");
    if (this.tasks.has(id)) throw new Error(`Task "${id}" already enqueued.`);
    const record: TaskRecord<T> = {
      id,
      kind: def.kind,
      payload: def.payload,
      priority: def.priority ?? 0,
      retry: { ...this.defaultRetry, ...def.retry },
      dependencies: def.dependencies ?? [],
      timeoutMs: def.timeoutMs,
      scheduledFor: def.scheduledFor,
      status: def.scheduledFor ? "scheduled" : "queued",
      attempts: 0,
      createdAt: nowIso(),
    };
    this.tasks.set(id, record as TaskRecord);
    return record;
  }

  get<T = unknown>(id: string): TaskRecord<T> | undefined {
    return this.tasks.get(id) as TaskRecord<T> | undefined;
  }

  list(filter: TaskFilter = {}): TaskRecord[] {
    const statuses = filter.statuses ?? (filter.status ? [filter.status] : undefined);
    return [...this.tasks.values()].filter((task) => {
      if (filter.kind && task.kind !== filter.kind) return false;
      if (statuses && !statuses.includes(task.status)) return false;
      return true;
    });
  }

  /** Returns the highest-priority ready task: queued, schedule reached, all deps succeeded. */
  dequeue(): TaskRecord | undefined {
    const now = Date.now();
    const ready = this.list({ statuses: ["queued", "scheduled"] }).filter((task) => {
      if (task.scheduledFor && Date.parse(task.scheduledFor) > now) return false;
      return task.dependencies.every((depId) => {
        const dep = this.tasks.get(depId);
        return dep && TERMINAL_SUCCESS.includes(dep.status);
      });
    });
    ready.sort((a, b) => b.priority - a.priority || Date.parse(a.createdAt) - Date.parse(b.createdAt));
    const next = ready[0];
    if (!next) return undefined;
    next.status = "running";
    next.attempts += 1;
    next.startedAt = next.startedAt ?? nowIso();
    next.lastAttemptAt = nowIso();
    return next;
  }

  complete(id: string, result: unknown): TaskRecord {
    const task = this.requireTask(id);
    task.status = "succeeded";
    task.completedAt = nowIso();
    task.result = result;
    return task;
  }

  fail(id: string, error: { message: string; code?: string }): TaskRecord {
    const task = this.requireTask(id);
    task.error = error;
    if (task.attempts >= task.retry.maxAttempts) {
      task.status = "dead";
      task.completedAt = nowIso();
      return task;
    }
    const delay = task.retry.backoffMs * 2 ** Math.max(0, task.attempts - 1);
    task.status = "scheduled";
    task.scheduledFor = new Date(Date.now() + delay).toISOString();
    return task;
  }

  cancel(id: string): TaskRecord {
    const task = this.requireTask(id);
    if (task.status === "running" || task.status === "queued" || task.status === "scheduled") {
      task.status = "cancelled";
      task.completedAt = nowIso();
    }
    return task;
  }

  /** Tasks that exhausted retries and live in the dead-letter sink. */
  deadLetter(): TaskRecord[] {
    return this.list({ status: "dead" });
  }

  /** Removes terminal-state records older than `olderThanMs`. Returns count removed. */
  reap(olderThanMs: number): number {
    const cutoff = Date.now() - olderThanMs;
    let removed = 0;
    for (const [id, task] of this.tasks) {
      if (!task.completedAt) continue;
      if (Date.parse(task.completedAt) >= cutoff) continue;
      if (!["succeeded", "cancelled", "dead"].includes(task.status)) continue;
      this.tasks.delete(id);
      removed += 1;
    }
    return removed;
  }

  private requireTask(id: string): TaskRecord {
    const task = this.tasks.get(id);
    if (!task) throw new Error(`Unknown task "${id}".`);
    return task;
  }
}
