import type { Timestamp } from "../../types/common.js";

export type TaskStatus =
  | "queued"
  | "scheduled"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "dead";

export interface RetryPolicy {
  maxAttempts: number;
  /** Base backoff in ms; actual delay = backoffMs * 2^(attempts-1). */
  backoffMs: number;
}

export interface TaskDefinition<T = unknown> {
  id?: string;
  kind: string;
  payload: T;
  /** Higher value = earlier dequeue. Defaults to 0. */
  priority?: number;
  retry?: Partial<RetryPolicy>;
  /** IDs of other tasks that must reach a terminal-success state before this one can run. */
  dependencies?: string[];
  timeoutMs?: number;
  /** Earliest time the task may start running. */
  scheduledFor?: Timestamp;
}

export interface TaskRecord<T = unknown> {
  id: string;
  kind: string;
  payload: T;
  priority: number;
  retry: RetryPolicy;
  dependencies: string[];
  timeoutMs?: number;
  scheduledFor?: Timestamp;
  status: TaskStatus;
  attempts: number;
  createdAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  lastAttemptAt?: Timestamp;
  result?: unknown;
  error?: { message: string; code?: string };
}

export interface TaskFilter {
  kind?: string;
  status?: TaskStatus;
  /** Match any of the listed statuses. */
  statuses?: TaskStatus[];
}
