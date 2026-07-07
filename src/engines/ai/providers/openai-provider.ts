import { createProviderError } from "../provider.js";
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

export interface OpenAIProviderOptions {
  apiKey: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
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

  constructor(private readonly options: OpenAIProviderOptions) {
    this.baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private headers(): Record<string, string> {
    return {
      "content-type": "application/json",
      authorization: `Bearer ${this.options.apiKey}`,
    };
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
    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.buildBody(request, false)),
      signal: request.signal,
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
  }

  async *stream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.buildBody(request, true)),
      signal: request.signal,
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
  }
}
