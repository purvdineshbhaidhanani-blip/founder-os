import { NO_RETRY_POLICY, withRetry, withTimeoutSignal, type RetryPolicy } from "@platform/shared";
import { createProviderError, isAIProviderError } from "../provider.js";
import type {
  AIProvider,
  AIProviderInfo,
  ChatMessage,
  CompletionRequest,
  CompletionResponse,
  FinishReason,
  StreamChunk,
  ToolCallRequest,
} from "../types.js";

/** Generous default: completions are slow, unlike a typical REST call. Set 0 to disable. */
const DEFAULT_TIMEOUT_MS = 120_000;

export interface OpenAIProviderOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  /** Aborts a request that runs longer than this. 0 disables the timeout. Defaults to 120s. */
  timeoutMs?: number;
  /**
   * Applied to `complete()` only — never to `stream()`, where retrying after
   * the caller has already consumed some chunks would replay/duplicate
   * output. Defaults to `NO_RETRY_POLICY` (no retry): retrying is a caller
   * opt-in, not a side effect of not choosing (see `NO_RETRY_POLICY` in
   * `@platform/shared`).
   */
  retryPolicy?: RetryPolicy;
}

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenAIMessage {
  role: string;
  content?: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
  name?: string;
}

function toOpenAIMessages(messages: ChatMessage[]): OpenAIMessage[] {
  return messages.map((m) => {
    if (m.role === "tool") {
      return { role: "tool", content: m.content ?? "", tool_call_id: m.toolCallId ?? "", name: m.name };
    }
    return {
      role: m.role,
      content: m.content ?? null,
      tool_calls: m.toolCalls?.map((call) => ({
        id: call.id,
        type: "function" as const,
        function: { name: call.name, arguments: JSON.stringify(call.arguments) },
      })),
    };
  });
}

function fromOpenAIFinishReason(reason: string | null | undefined): FinishReason {
  switch (reason) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "tool_calls":
      return "tool_calls";
    case "content_filter":
      return "content_filter";
    default:
      return "stop";
  }
}

/**
 * Adapter for OpenAI-compatible chat-completions APIs (OpenAI itself, and any
 * self-hosted or third-party service that mirrors the same wire format).
 */
export class OpenAIProvider implements AIProvider {
  readonly info: AIProviderInfo = {
    id: "openai",
    displayName: "OpenAI",
    supportsStreaming: true,
    supportsTools: true,
  };

  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly retryPolicy: RetryPolicy;

  constructor(private readonly options: OpenAIProviderOptions) {
    if (!options.apiKey) throw new Error("OpenAIProvider requires an apiKey.");
    this.baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retryPolicy = options.retryPolicy ?? NO_RETRY_POLICY;
  }

  private headers(): Record<string, string> {
    return {
      "content-type": "application/json",
      authorization: `Bearer ${this.options.apiKey}`,
    };
  }

  /** Never retry past an explicit caller cancellation; otherwise fall back to "retryable AIProviderError". */
  private effectiveRetryPolicy(signal: AbortSignal | undefined): RetryPolicy {
    return {
      ...this.retryPolicy,
      shouldRetry: (error, attempt) => {
        if (signal?.aborted) return false;
        if (this.retryPolicy.shouldRetry) return this.retryPolicy.shouldRetry(error, attempt);
        return isAIProviderError(error) && error.retryable;
      },
    };
  }

  /** Normalizes a timeout/cancellation into a typed, correctly-`retryable` AIProviderError. */
  private normalizeError(error: unknown, externalSignal: AbortSignal | undefined): unknown {
    if (isAIProviderError(error)) return error;
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      const callerAborted = externalSignal?.aborted === true;
      return createProviderError(
        this.info.id,
        callerAborted ? "OpenAI request was cancelled by caller." : `OpenAI request timed out after ${this.timeoutMs}ms.`,
        { retryable: !callerAborted, cause: error },
      );
    }
    return error;
  }

  private buildBody(request: CompletionRequest, stream: boolean): Record<string, unknown> {
    return {
      model: request.config.model,
      messages: toOpenAIMessages(request.messages),
      temperature: request.config.temperature,
      max_tokens: request.config.maxOutputTokens,
      top_p: request.config.topP,
      stop: request.config.stopSequences,
      stream,
      tools: request.tools?.map((tool) => ({
        type: "function",
        function: { name: tool.name, description: tool.description, parameters: tool.parameters },
      })),
    };
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    return withRetry(() => this.doComplete(request), this.effectiveRetryPolicy(request.signal));
  }

  private async doComplete(request: CompletionRequest): Promise<CompletionResponse> {
    const { signal, cancel } = withTimeoutSignal(this.timeoutMs, request.signal);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(this.buildBody(request, false)),
        signal,
      });
      if (!response.ok) {
        const body = await response.text();
        throw createProviderError(this.info.id, `OpenAI request failed: ${body}`, {
          statusCode: response.status,
          retryable: response.status === 429 || response.status >= 500,
        });
      }
      const data = (await response.json()) as {
        id: string;
        choices: Array<{ message: OpenAIMessage; finish_reason: string | null }>;
        usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      };
      const choice = data.choices[0];
      const toolCalls: ToolCallRequest[] | undefined = choice?.message.tool_calls?.map((call) => ({
        id: call.id,
        name: call.function.name,
        arguments: JSON.parse(call.function.arguments || "{}"),
      }));
      const message: ChatMessage = {
        role: "assistant",
        content: choice?.message.content ?? undefined,
        toolCalls,
      };
      return {
        message,
        finishReason: fromOpenAIFinishReason(choice?.finish_reason),
        usage: {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        },
        providerRequestId: data.id,
      };
    } catch (error) {
      throw this.normalizeError(error, request.signal);
    } finally {
      cancel();
    }
  }

  async *stream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    const { signal, cancel } = withTimeoutSignal(this.timeoutMs, request.signal);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify(this.buildBody(request, true)),
        signal,
      });
      if (!response.ok || !response.body) {
        const body = response.body ? await response.text() : "no body";
        throw createProviderError(this.info.id, `OpenAI stream failed: ${body}`, {
          statusCode: response.status,
          retryable: response.status === 429 || response.status >= 500,
        });
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finishReason: FinishReason = "stop";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice("data: ".length).trim();
          if (payload === "[DONE]") continue;
          const parsed = JSON.parse(payload) as {
            choices: Array<{
              delta: { content?: string; tool_calls?: Array<{ index: number; id?: string; function?: { name?: string; arguments?: string } }> };
              finish_reason: string | null;
            }>;
          };
          const choice = parsed.choices[0];
          if (!choice) continue;
          if (choice.delta.content) {
            yield { type: "text-delta", delta: choice.delta.content };
          }
          for (const call of choice.delta.tool_calls ?? []) {
            yield {
              type: "tool-call-delta",
              id: call.id ?? String(call.index),
              name: call.function?.name,
              argumentsDelta: call.function?.arguments,
            };
          }
          if (choice.finish_reason) finishReason = fromOpenAIFinishReason(choice.finish_reason);
        }
      }
      yield {
        type: "finish",
        finishReason,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      };
    } catch (error) {
      throw this.normalizeError(error, request.signal);
    } finally {
      cancel();
    }
  }
}
