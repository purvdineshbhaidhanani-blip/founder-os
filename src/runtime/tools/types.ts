import type { ZodSchema } from "zod";
import type { Timestamp } from "../../types/common.js";

/**
 * Tool Execution Engine (Loop 3) types. This is the layer that lets agents
 * ACT (read/write files, run shell commands, use git, call HTTP, search)
 * instead of only thinking. Additive to the runtime — does not alter
 * `src/runtime/agents/*` (Loop 2), the Registry, Memory, or the LLM Adapter.
 */

export type ToolPermissionMode = "allowed" | "denied" | "ask-user" | "read-only" | "workspace-only";

/** One tool's declared permission requirement — what the tool itself needs to operate. */
export interface ToolPermissionSpec {
  mode: ToolPermissionMode;
  /** Human-readable reason shown to an operator when mode is "ask-user". */
  reason: string;
}

export interface ToolRetryPolicy {
  /** Total attempts including the first (1 = no retry). */
  maxAttempts: number;
  /** Base delay between attempts; doubles each retry (exponential backoff). */
  baseDelayMs: number;
}

/** Every field a caller passes into a tool execution. */
export interface ToolExecutionContext {
  /** The task/request this execution serves (for logging/traceability). */
  task?: string;
  /** The agent id invoking the tool, if any (a human/operator may also call tools directly). */
  agent?: string;
  /** Sandbox root every filesystem/shell path is contained to. Required for file/shell/git tools. */
  workingDirectory: string;
  /** Arbitrary caller-supplied environment values passed to shell/git tools (merged over process.env, never replacing it). */
  env?: Record<string, string>;
  /** Extra free-form runtime context (mirrors AgentExecutionContext from Loop 2). */
  runtimeContext?: Record<string, unknown>;
  signal?: AbortSignal;
}

export type ToolResultStatus = "success" | "failure";

export interface ToolResultMetadata {
  toolId: string;
  attempts: number;
  startedAt: Timestamp;
  completedAt: Timestamp;
  durationMs: number;
  /** True when this result came from the permission system without the tool body ever running. */
  permissionDenied?: boolean;
}

export interface ToolResult<TData = unknown> {
  status: ToolResultStatus;
  data?: TData;
  error?: { reason: string; message: string };
  metadata: ToolResultMetadata;
  duration: number;
}

/**
 * A single, self-describing tool. `run` is the only thing an implementation
 * provides — discovery, validation, permission checks, timeout, retry, and
 * eventing are ALL handled by `ToolExecutor`, never duplicated per tool.
 */
export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  id: string;
  name: string;
  description: string;
  /** Free-form capability tags (e.g. "filesystem", "shell", "git", "http", "search") for discovery/filtering. */
  capabilities: string[];
  permission: ToolPermissionSpec;
  inputSchema: ZodSchema<TInput>;
  outputSchema?: ZodSchema<TOutput>;
  timeoutMs: number;
  retryPolicy: ToolRetryPolicy;
  /** Pure-ish execution body. Must never throw for an EXPECTED failure (e.g. file not found) — return it as data or let the executor's catch produce a structured failure; either is handled. */
  run: (input: TInput, context: ToolExecutionContext) => Promise<TOutput>;
}

/** Serializable view of a tool, safe to expose to a model / UI (no `run` function). */
export interface ToolDescriptor {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  permission: ToolPermissionSpec;
  timeoutMs: number;
  retryPolicy: ToolRetryPolicy;
  /** JSON Schema rendering of `inputSchema`, for LLM tool-calling. */
  inputJsonSchema: Record<string, unknown>;
}

export type ToolEventName =
  | "tool.started"
  | "tool.finished"
  | "tool.failed"
  | "tool.retry"
  | "tool.cancelled";
