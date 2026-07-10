import OpenAI from "openai";
import { getPlatformEnv } from "../../config/index.js";
import type { AIProvider, CompletionRequest, CompletionResponse, StreamChunk, EmbeddingRequest, EmbeddingResponse } from "../types.js";

const DEFAULT_MODEL = "gpt-4o";
const EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_MAX_TOKENS = 4096;

let client: OpenAI | undefined;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: getPlatformEnv().OPENAI_API_KEY });
  }
  return client;
}

export function createOpenAIProvider(): AIProvider {
  return {
    name: "openai",

    async complete(request: CompletionRequest): Promise<CompletionResponse> {
      const start = performance.now();
      const response = await getClient().chat.completions.create({
        model: DEFAULT_MODEL,
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: request.temperature,
        messages: [
          ...(request.system ? [{ role: "system" as const, content: request.system }] : []),
          ...request.messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      });

      return {
        content: response.choices[0]?.message.content ?? "",
        provider: "openai",
        model: response.model,
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        wasFallback: false,
        wasCacheHit: false,
        latencyMs: Math.round(performance.now() - start),
      };
    },

    async *stream(request: CompletionRequest): AsyncGenerator<StreamChunk, void, unknown> {
      const stream = await getClient().chat.completions.create({
        model: DEFAULT_MODEL,
        max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: request.temperature,
        stream: true,
        messages: [
          ...(request.system ? [{ role: "system" as const, content: request.system }] : []),
          ...request.messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta.content ?? "";
        if (delta) yield { delta, done: false };
      }
      yield { delta: "", done: true };
    },

    async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
      const response = await getClient().embeddings.create({
        model: EMBEDDING_MODEL,
        input: request.input,
      });

      return {
        embeddings: response.data.map((item) => item.embedding),
        provider: "openai",
        model: response.model,
        inputTokens: response.usage.prompt_tokens,
      };
    },
  };
}
