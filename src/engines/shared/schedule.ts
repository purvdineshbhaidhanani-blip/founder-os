import { nextCronFireTime } from "./cron.js";

export type ScheduleSpec =
  | { type: "cron"; expression: string }
  | { type: "interval"; ms: number }
  | { type: "at"; date: string };

export interface ScheduleHandle {
  id: string;
  spec: ScheduleSpec;
  cancel(): void;
}

/**
 * Generic "run this later / run this on a schedule" contract. Shared by the
 * Workflow Engine (scheduling interface) and the Automation Engine (cron
 * abstraction) so both sit on the same scheduling primitive instead of each
 * inventing their own.
 */
export interface Scheduler {
  schedule(spec: ScheduleSpec, callback: () => void | Promise<void>): ScheduleHandle;
  cancel(handleId: string): void;
  list(): ScheduleHandle[];
}

let counter = 0;
function generateScheduleId(): string {
  counter += 1;
  return `sched_${Date.now()}_${counter}`;
}

/**
 * Timer-based scheduler suitable for a single Node process. Swap for a
 * distributed scheduler (e.g. backed by a durable queue) by implementing the
 * same `Scheduler` interface — nothing upstream needs to change.
 */
export class InProcessScheduler implements Scheduler {
  private readonly handles = new Map<string, ScheduleHandle & { timer?: NodeJS.Timeout }>();

  schedule(spec: ScheduleSpec, callback: () => void | Promise<void>): ScheduleHandle {
    const id = generateScheduleId();
    const entry: ScheduleHandle & { timer?: NodeJS.Timeout } = {
      id,
      spec,
      cancel: () => this.cancel(id),
    };

    if (spec.type === "interval") {
      entry.timer = setInterval(() => void callback(), spec.ms);
    } else if (spec.type === "at") {
      const delay = Math.max(0, new Date(spec.date).getTime() - Date.now());
      entry.timer = setTimeout(() => void callback(), delay);
    } else {
      const armCron = () => {
        const next = nextCronFireTime(spec.expression, new Date());
        const delay = Math.max(0, next.getTime() - Date.now());
        entry.timer = setTimeout(() => {
          void callback();
          if (this.handles.has(id)) armCron();
        }, delay);
      };
      armCron();
    }

    this.handles.set(id, entry);
    return entry;
  }

  cancel(handleId: string): void {
    const entry = this.handles.get(handleId);
    if (!entry) return;
    if (entry.timer) {
      if (entry.spec.type === "interval") clearInterval(entry.timer);
      else clearTimeout(entry.timer);
    }
    this.handles.delete(handleId);
  }

  list(): ScheduleHandle[] {
    return [...this.handles.values()];
  }
}
