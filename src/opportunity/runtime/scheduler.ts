import { generateId, nowIso } from "../../utils/id.js";
import type { ScheduledTask, ScheduleInterval } from "./types.js";

// ---------------------------------------------------------------------------
// Scheduler — tick-based task scheduler with 4 interval buckets
// ---------------------------------------------------------------------------

const INTERVAL_MS: Record<ScheduleInterval, number> = {
  "10min": 10 * 60 * 1000,
  "1hr": 60 * 60 * 1000,
  "6hr": 6 * 60 * 60 * 1000,
  "1day": 24 * 60 * 60 * 1000,
};

export class Scheduler {
  private readonly tasks = new Map<string, ScheduledTask>();

  register(name: string, interval: ScheduleInterval): ScheduledTask {
    const task: ScheduledTask = {
      id: generateId("task"),
      name,
      interval,
      lastRunAt: null,
      nextRunAt: nowIso(),
      runCount: 0,
      failCount: 0,
      enabled: true,
    };
    this.tasks.set(task.id, task);
    return task;
  }

  getDue(nowMs: number = Date.now()): ScheduledTask[] {
    const due: ScheduledTask[] = [];
    for (const task of this.tasks.values()) {
      if (!task.enabled) continue;
      if (new Date(task.nextRunAt).getTime() <= nowMs) {
        due.push(task);
      }
    }
    return due;
  }

  markStarted(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.lastRunAt = nowIso();
  }

  markCompleted(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.runCount++;
    task.nextRunAt = new Date(Date.now() + INTERVAL_MS[task.interval]).toISOString();
  }

  markFailed(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.failCount++;
    // Back off: retry after half the normal interval
    const backoffMs = INTERVAL_MS[task.interval] / 2;
    task.nextRunAt = new Date(Date.now() + backoffMs).toISOString();
  }

  enable(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) task.enabled = true;
  }

  disable(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task) task.enabled = false;
  }

  getAll(): ScheduledTask[] {
    return [...this.tasks.values()];
  }

  getByName(name: string): ScheduledTask | undefined {
    for (const t of this.tasks.values()) {
      if (t.name === name) return t;
    }
    return undefined;
  }

  size(): number {
    return this.tasks.size;
  }
}
