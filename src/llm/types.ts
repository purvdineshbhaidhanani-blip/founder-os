/**
 * LLM Adapter — provider-agnostic contract for executing prompts against a
 * chat model. This is the layer the existing `ModelRouter` (src/routing) was
 * missing: the router *selects* a model (provider + name); an `LlmProvider`
 * *executes* against it. Nothing here is provider-specific — Ollama, or any
 * future backend, implements `LlmProvider`.
 *
 * Deterministic-core note: the rest of Founder OS is deterministic and makes
 * no model calls. This adapter is an OPT-IN execution layer for the
 * "executable agent" runtime; it never runs implicitly and never touches the
 * scoring/decision pipeline.
 */

/**
 * "tool" is additive (Loop 3): the result of a tool call fed back to the
 * model. Existing callers that never set `tools`/`toolCallId` are wholly
 * unaffected — "system"/"user"/"assistant" behave exactly as before.
 */
export type LlmRole = "system" | "user" | "assistant" | "tool";

export interface LlmMessage {
  role: LlmRole;
  content: string;
  /** Set on a "tool" message: which tool call (by id) this content answers. */
  toolCallId?: string;
  /** Set on an "assistant" message that itself requested tool calls. */
  toolCalls?: LlmToolCall[];
}

/** A tool the model may call, described in JSON-Schema form (matches ToolDescriptor.inputJsonSchema from src/runtime/tools). */
export interface LlmTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/** One tool invocation the model requested. `arguments` is always a parsed object — providers are responsible for parsing a string-encoded form if their backend returns one. */
export interface LlmToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LlmCompletionRequest {
  /** Model name as the provider expects it (e.g. "llama3.1"). */
  model: string;
  messages: LlmMessage[];
  /** 0-2; provider clamps/ignores if unsupported. */
  temperature?: number;
  /** Max tokens to generate. */
  maxTokens?: number;
  /** Stop sequences. */
  stop?: string[];
  /** Abort signal for caller-controlled cancellation. */
  signal?: AbortSignal;
  /** Tools the model may call. Omit entirely for a plain completion (unchanged Loop 2 behavior). */
  tools?: LlmTool[];
}

export interface LlmCompletionResult {
  text: string;
  model: string;
  provider: string;
  promptTokens?: number;
  completionTokens?: number;
  finishReason?: string;
  /** Present only when the model's response requested one or more tool calls. */
  toolCalls?: LlmToolCall[];
}

/**
 * Every provider must NEVER throw for an operational failure (model down,
 * timeout, non-2xx) — those surface as a typed `LlmError` the caller can
 * branch on. Programmer errors (bad arguments) may still throw synchronously.
 */
export interface LlmProvider {
  readonly id: string;
  /** True when the backend is reachable and ready to serve completions. */
  isAvailable(signal?: AbortSignal): Promise<boolean>;
  complete(request: LlmCompletionRequest): Promise<LlmCompletionResult>;
}

export type LlmErrorReason =
  | "unavailable"
  | "timeout"
  | "model-not-found"
  | "bad-response"
  | "http-error"
  | "unknown";

/** Typed, non-secret operational error. Providers throw this (not raw fetch errors) from `complete`. */
export class LlmError extends Error {
  readonly reason: LlmErrorReason;
  readonly provider: string;
  readonly status?: number;

  constructor(provider: string, reason: LlmErrorReason, message: string, status?: number) {
    super(message);
    this.name = "LlmError";
    this.provider = provider;
    this.reason = reason;
    if (status !== undefined) this.status = status;
  }
}
