import type { Timestamp } from "../../types/common.js";

export interface ExecutionUnit<TInput = unknown, TOutput = unknown> {
  id: string;
  /** Names of other unit ids that must finish before this one runs (used by dependency-aware mode). */
  dependsOn?: string[];
  run: (input: TInput) => Promise<TOutput> | TOutput;
  input: TInput;
}

export interface ExecutionResult<TOutput = unknown> {
  id: string;
  ok: boolean;
  output?: TOutput;
  error?: { message: string; code?: string };
  startedAt: Timestamp;
  completedAt: Timestamp;
  durationMs: number;
}

export interface ExecutionOptions {
  /** Maximum number of units that may run at once in parallel mode. Default: Infinity. */
  concurrency?: number;
  /** Stop scheduling new units after the first failure. Default: false. */
  stopOnFailure?: boolean;
}
