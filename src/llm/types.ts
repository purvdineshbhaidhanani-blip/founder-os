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

export type LlmRole = "system" | "user" | "assistant";

export interface LlmMessage {
  role: LlmRole;
  content: string;
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
}

export interface LlmCompletionResult {
  text: string;
  model: string;
  provider: string;
  promptTokens?: number;
  completionTokens?: number;
  finishReason?: string;
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
