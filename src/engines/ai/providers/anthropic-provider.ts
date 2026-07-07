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

export interface AnthropicProviderOptions {
  apiKey: string;
  baseUrl?: string;
  apiVersion?: string;
  fetchImpl?: typeof fetch;
}

interface AnthropicContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

function toAnthropicMessages(messages: ChatMessage[]): {
  system?: string;
  messages: Array<{ role: "user" | "assistant"; content: AnthropicContentBlock[] }>;
} {
  const system = messages.find((m) => m.role === "system")?.content;
  const rest = messages.filter((m) => m.role !== "system");
  const converted = rest.map((m) => {
    if (m.role === "tool") {
      return {
        role: "user" as const,
        content: [
          {
            type: "tool_result" as const,
            tool_use_id: m.toolCallId ?? "",
            content: m.content ?? "",
          },
        ],
      };
    }
    const blocks: AnthropicContentBlock[] = [];
    if (m.content) blocks.push({ type: "text", text: m.content });
    for (const call of m.toolCalls ?? []) {
      blocks.push({ type: "tool_use", id: call.id, name: call.name, input: call.arguments });
    }
    return { role: m.role === "assistant" ? ("assistant" as const) : ("user" as const), content: blocks };
  });
  return { system, messages: converted };
}

function fromAnthropicFinishReason(reason: string | null): FinishReason {
  switch (reason) {
    case "end_turn":
    case "stop_sequence":
      return "stop";
    case "max_tokens":
      return "length";
    case "tool_use":
      return "tool_calls";
    default:
      return "stop";
  }
}

/**
 * Adapter for the Anthropic Messages API. Talks over plain `fetch` — no SDK
 * dependency — so it stays swappable and auditable like every other adapter.
 */
export class AnthropicProvider implements AIProvider {
  readonly info: AIProviderInfo = {
    id: "anthropic",
    displayName: "Anthropic",
    supportsStreaming: true,
    supportsTools: true,
  };

  private readonly baseUrl: string;
  private readonly apiVersion: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: AnthropicProviderOptions) {
    this.baseUrl = options.baseUrl ?? "https://api.anthropic.com/v1";
    this.apiVersion = options.apiVersion ?? "2023-06-01";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private headers(): Record<string, string> {
    return {
      "content-type": "application/json",
      "x-api-key": this.options.apiKey,
      "anthropic-version": this.apiVersion,
    };
  }

  private buildBody(request: CompletionRequest, stream: boolean): Record<string, unknown> {
    const { system, messages } = toAnthropicMessages(request.messages);
    return {
      model: request.config.model,
      system,
      messages,
      max_tokens: request.config.maxOutputTokens ?? 1024,
      temperature: request.config.temperature,
      top_p: request.config.topP,
      stop_sequences: request.config.stopSequences,
      stream,
      tools: request.tools?.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.parameters,
      })),
    };
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const response = await this.fetchImpl(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.buildBody(request, false)),
      signal: request.signal,
    });
    if (!response.ok) {
      const body = await response.text();
      throw createProviderError(this.info.id, `Anthropic request failed: ${body}`, {
        statusCode: response.status,
        retryable: response.status === 429 || response.status >= 500,
      });
    }
    const data = (await response.json()) as {
      id: string;
      content: AnthropicContentBlock[];
      stop_reason: string | null;
      usage: { input_tokens: number; output_tokens: number };
    };
    const text = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    const toolCalls: ToolCallRequest[] = data.content
      .filter((b) => b.type === "tool_use")
      .map((b) => ({ id: b.id ?? "", name: b.name ?? "", arguments: b.input ?? {} }));
    const message: ChatMessage = {
      role: "assistant",
      content: text || undefined,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
    return {
      message,
      finishReason: fromAnthropicFinishReason(data.stop_reason),
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      providerRequestId: data.id,
    };
  }

  async *stream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    const response = await this.fetchImpl(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(this.buildBody(request, true)),
      signal: request.signal,
    });
    if (!response.ok || !response.body) {
      const body = response.body ? await response.text() : "no body";
      throw createProviderError(this.info.id, `Anthropic stream failed: ${body}`, {
        statusCode: response.status,
        retryable: response.status === 429 || response.status >= 500,
      });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const usage: { inputTokens: number; outputTokens: number } = { inputTokens: 0, outputTokens: 0 };
    let finishReason: FinishReason = "stop";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = JSON.parse(line.slice("data: ".length)) as {
          type: string;
          delta?: {
            type: string;
            text?: string;
            partial_json?: string;
            stop_reason?: string | null;
          };
          content_block?: { type: string; id?: string; name?: string };
          message?: { usage?: { input_tokens: number } };
          usage?: { output_tokens: number };
        };
        if (payload.type === "content_block_delta" && payload.delta?.type === "text_delta") {
          yield { type: "text-delta", delta: payload.delta.text ?? "" };
        } else if (
          payload.type === "content_block_delta" &&
          payload.delta?.type === "input_json_delta"
        ) {
          yield { type: "tool-call-delta", id: "", argumentsDelta: payload.delta.partial_json };
        } else if (payload.type === "content_block_start" && payload.content_block?.type === "tool_use") {
          yield {
            type: "tool-call-delta",
            id: payload.content_block.id ?? "",
            name: payload.content_block.name,
          };
        } else if (payload.type === "message_start" && payload.message?.usage) {
          usage.inputTokens = payload.message.usage.input_tokens;
        } else if (payload.type === "message_delta") {
          if (payload.usage) usage.outputTokens = payload.usage.output_tokens;
          if (payload.delta?.stop_reason) {
            finishReason = fromAnthropicFinishReason(payload.delta.stop_reason);
          }
        }
      }
    }
    yield {
      type: "finish",
      finishReason,
      usage: { ...usage, totalTokens: usage.inputTokens + usage.outputTokens },
    };
  }
}
