import { createLogger } from "../utils/logger.js";
import { LlmError, type LlmCompletionRequest, type LlmCompletionResult, type LlmProvider } from "./types.js";

const logger = createLogger("llm.ollama");

/** Default local Ollama endpoint; override with OLLAMA_HOST. */
export const DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434";
const DEFAULT_TIMEOUT_MS = 120_000;

interface OllamaChatResponse {
  model?: string;
  message?: { role?: string; content?: string };
  done?: boolean;
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface OllamaTagsResponse {
  models?: Array<{ name?: string }>;
}

export interface OllamaProviderOptions {
  /** Base URL of the Ollama server. Defaults to OLLAMA_HOST or DEFAULT_OLLAMA_HOST. */
  host?: string;
  /** Per-request timeout in ms. */
  timeoutMs?: number;
}

/**
 * Ollama chat provider. Talks to a LOCAL Ollama daemon (`ollama serve`) over
 * its HTTP API using the global `fetch` — no SDK, no dependency. Requires no
 * API key and no external account: the default target is 127.0.0.1:11434.
 *
 * All operational failures resolve to a typed {@link LlmError}; the daemon
 * being absent is reported as `reason: "unavailable"` rather than an uncaught
 * network error, so callers (and the future agent runtime) degrade cleanly
 * when no local model is installed.
 */
export class OllamaProvider implements LlmProvider {
  readonly id = "ollama";
  private readonly host: string;
  private readonly timeoutMs: number;

  constructor(options: OllamaProviderOptions = {}) {
    this.host = (options.host ?? process.env.OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST).replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async isAvailable(signal?: AbortSignal): Promise<boolean> {
    try {
      const res = await this.fetchWithTimeout(`${this.host}/api/tags`, { method: "GET" }, signal, 5_000);
      return res.ok;
    } catch {
      return false;
    }
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResult> {
    if (!request.model) throw new LlmError(this.id, "model-not-found", "No model specified for Ollama completion.");
    if (request.messages.length === 0) {
      throw new LlmError(this.id, "bad-response", "At least one message is required.");
    }

    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
    };
    const options: Record<string, unknown> = {};
    if (request.temperature !== undefined) options.temperature = request.temperature;
    if (request.maxTokens !== undefined) options.num_predict = request.maxTokens;
    if (request.stop && request.stop.length > 0) options.stop = request.stop;
    if (Object.keys(options).length > 0) body.options = options;

    let res: Response;
    try {
      res = await this.fetchWithTimeout(
        `${this.host}/api/chat`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
        request.signal,
        this.timeoutMs,
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new LlmError(this.id, "timeout", `Ollama request timed out after ${this.timeoutMs}ms.`);
      }
      throw new LlmError(this.id, "unavailable", `Cannot reach Ollama at ${this.host}. Is 'ollama serve' running?`);
    }

    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      const reason = res.status === 404 ? "model-not-found" : "http-error";
      throw new LlmError(this.id, reason, `Ollama returned ${res.status}: ${detail || res.statusText}`, res.status);
    }

    let parsed: OllamaChatResponse;
    try {
      parsed = (await res.json()) as OllamaChatResponse;
    } catch {
      throw new LlmError(this.id, "bad-response", "Ollama returned a non-JSON body.");
    }

    const text = parsed.message?.content;
    if (typeof text !== "string") {
      throw new LlmError(this.id, "bad-response", "Ollama response contained no message content.");
    }

    logger.info("ollama completion", {
      model: parsed.model ?? request.model,
      completionTokens: parsed.eval_count,
      finishReason: parsed.done_reason,
    });

    return {
      text,
      provider: this.id,
      model: parsed.model ?? request.model,
      ...(parsed.prompt_eval_count !== undefined ? { promptTokens: parsed.prompt_eval_count } : {}),
      ...(parsed.eval_count !== undefined ? { completionTokens: parsed.eval_count } : {}),
      ...(parsed.done_reason ? { finishReason: parsed.done_reason } : {}),
    };
  }

  /** Lists locally-installed model names (empty when the daemon is unreachable). */
  async listModels(signal?: AbortSignal): Promise<string[]> {
    try {
      const res = await this.fetchWithTimeout(`${this.host}/api/tags`, { method: "GET" }, signal, 5_000);
      if (!res.ok) return [];
      const body = (await res.json()) as OllamaTagsResponse;
      return (body.models ?? []).map((m) => m.name ?? "").filter(Boolean);
    } catch {
      return [];
    }
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    externalSignal: AbortSignal | undefined,
    timeoutMs: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onExternalAbort = (): void => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener("abort", onExternalAbort, { once: true });
    }
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", onExternalAbort);
    }
  }
}
