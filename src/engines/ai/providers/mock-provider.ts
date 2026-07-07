import type {
  AIProvider,
  AIProviderInfo,
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
} from "../types.js";

export interface MockProviderOptions {
  /** Deterministic responder. Defaults to echoing the last user message. */
  respond?: (request: CompletionRequest) => string;
  /** Milliseconds to wait between streamed characters. Defaults to 0 (synchronous). */
  streamDelayMs?: number;
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Zero-dependency provider used for tests, local development, and as the
 * default fallback when no real provider is configured. Guarantees the AI
 * Engine has no hard dependency on any vendor SDK or network access.
 */
export class MockProvider implements AIProvider {
  readonly info: AIProviderInfo = {
    id: "mock",
    displayName: "Mock Provider",
    supportsStreaming: true,
    supportsTools: true,
  };

  constructor(private readonly options: MockProviderOptions = {}) {}

  private renderText(request: CompletionRequest): string {
    if (this.options.respond) return this.options.respond(request);
    const lastUser = [...request.messages].reverse().find((m) => m.role === "user");
    return lastUser?.content ? `Echo: ${lastUser.content}` : "Echo: (no user message)";
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const text = this.renderText(request);
    const inputTokens = request.messages.reduce(
      (sum, m) => sum + estimateTokens(m.content ?? ""),
      0,
    );
    const outputTokens = estimateTokens(text);
    return {
      message: { role: "assistant", content: text },
      finishReason: "stop",
      usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
      providerRequestId: `mock_${Date.now()}`,
    };
  }

  async *stream(request: CompletionRequest): AsyncIterable<StreamChunk> {
    const text = this.renderText(request);
    for (const char of text) {
      if (request.signal?.aborted) return;
      if (this.options.streamDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, this.options.streamDelayMs));
      }
      yield { type: "text-delta", delta: char };
    }
    const outputTokens = estimateTokens(text);
    yield {
      type: "finish",
      finishReason: "stop",
      usage: { inputTokens: 0, outputTokens, totalTokens: outputTokens },
    };
  }
}
