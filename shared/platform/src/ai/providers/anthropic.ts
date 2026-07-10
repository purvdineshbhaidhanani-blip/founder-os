import Anthropic from "@anthropic-ai/sdk";
import { getPlatformEnv } from "../../config/index.js";
import type { AIProvider, CompletionRequest, CompletionResponse, StreamChunk, EmbeddingRequest, EmbeddingResponse } from "../types.js";

const DEFAULT_MODEL = "claude-sonnet-4-5";
const DEFAULT_MAX_TOKENS = 4096;

let client: Anthropic | undefined;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: getPlatformEnv().ANTHROPIC_API_KEY });
  }
  return client;
}

export function createAnthropicProvider(): AIProvider {
  return {
    name: "anthropic",

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
      const start = performance.now();
      const response = await getClient().messages.create({
        model: DEFAULT_MODEL,
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: request.temperature,
        system: request.system,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      });

      const textBlock = response.content.find((block) => block.type === "text");

      return {
        content: textBlock && textBlock.type === "text" ? textBlock.text : "",
        provider: "anthropic",
        model: response.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        wasFallback: false,
        wasCacheHit: false,
        latencyMs: Math.round(performance.now() - start),
      };
    },

    async *stream(request: CompletionRequest): AsyncGenerator<StreamChunk, void, unknown> {
      const stream = getClient().messages.stream({
        model: DEFAULT_MODEL,
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: request.temperature,
        system: request.system,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          yield { delta: event.delta.text, done: false };
        }
      }
      yield { delta: "", done: true };
    },

    async embed(_request: EmbeddingRequest): Promise<EmbeddingResponse> {
      // Anthropic does not offer a first-party embeddings endpoint as of
      // this writing; embeddings route through the OpenAI provider (see
      // ai/router.ts's EMBEDDING_PROVIDER constant) even when Anthropic is
      // the default completion provider.
      throw new Error("Anthropic provider does not support embeddings — use the OpenAI provider for SH-AI-9.");
    },
  };
}
