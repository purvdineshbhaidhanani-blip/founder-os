import { isAIProviderConfigured } from "../config/index.js";
import { integrationNotConfiguredError } from "../errors/index.js";
import { withRetry } from "./retry.js";
import { createAnthropicProvider } from "./providers/anthropic.js";
import { createOpenAIProvider } from "./providers/openai.js";
import type { AIProvider, CompletionRequest, CompletionResponse } from "./types.js";

let anthropicProvider: AIProvider | undefined;
let openaiProvider: AIProvider | undefined;

function getAnthropicProvider(): AIProvider {
  if (!anthropicProvider) anthropicProvider = createAnthropicProvider();
  return anthropicProvider;
}

function getOpenAIProvider(): AIProvider {
  if (!openaiProvider) openaiProvider = createOpenAIProvider();
  return openaiProvider;
}

/**
 * Model routing with fallback per standards/ai.md: Claude is the default
 * provider; if it's unavailable or fails after retries, a configured
 * secondary provider is tried before giving up. If neither provider is
 * configured, every call fails closed with INTEGRATION_NOT_CONFIGURED —
 * the Phase 1 rule applied to AI the same as OAuth/email/billing.
 */
export async function routeCompletion(request: CompletionRequest): Promise<CompletionResponse> {
  const anthropicReady = isAIProviderConfigured("anthropic");
  const openaiReady = isAIProviderConfigured("openai");

  if (!anthropicReady && !openaiReady) {
    throw integrationNotConfiguredError("AI provider (Anthropic or OpenAI)");
  }

  if (anthropicReady) {
    try {
      return await withRetry(() => getAnthropicProvider().complete(request));
    } catch (err) {
      if (!openaiReady) throw err;
      const fallbackResult = await withRetry(() => getOpenAIProvider().complete(request));
      return { ...fallbackResult, wasFallback: true };
    }
  }

  // Anthropic not configured at all — go straight to OpenAI, no fallback flag (it's the only available provider, not a fallback from a failure).
  return withRetry(() => getOpenAIProvider().complete(request));
}

export async function* routeStream(request: CompletionRequest) {
  const anthropicReady = isAIProviderConfigured("anthropic");
  const openaiReady = isAIProviderConfigured("openai");

  if (!anthropicReady && !openaiReady) {
    throw integrationNotConfiguredError("AI provider (Anthropic or OpenAI)");
  }

  const provider = anthropicReady ? getAnthropicProvider() : getOpenAIProvider();
  yield* provider.stream(request);
}

/** Embeddings always route to OpenAI (see providers/anthropic.ts) — Anthropic has no first-party embeddings endpoint. */
export function getEmbeddingProvider(): AIProvider {
  if (!isAIProviderConfigured("openai")) {
    throw integrationNotConfiguredError("OpenAI (required for embeddings)");
  }
  return getOpenAIProvider();
}
