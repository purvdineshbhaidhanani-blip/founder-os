import { routeCompletion, routeStream, getEmbeddingProvider } from "./router.js";
import { getCachedCompletion, setCachedCompletion } from "./cache.js";
import { recordAiUsage } from "./usage-tracking.js";
import type { CompletionRequest, CompletionResponse, EmbeddingRequest, EmbeddingResponse } from "./types.js";

/**
 * The single entry point every product calls — never `router.ts` directly
 * — so caching and usage tracking can never be accidentally skipped.
 */
export async function complete(request: CompletionRequest): Promise<CompletionResponse> {
  const cached = await getCachedCompletion(request);
  if (cached) {
    await recordAiUsage({
      feature: request.feature,
      organizationId: request.organizationId,
      userId: request.userId,
      response: cached,
      promptVersion: request.promptVersion,
    });
    return cached;
  }

  const response = await routeCompletion(request);
  await setCachedCompletion(request, response);
  await recordAiUsage({
    feature: request.feature,
    organizationId: request.organizationId,
    userId: request.userId,
    response,
    promptVersion: request.promptVersion,
  });

  return response;
}

/** Streaming responses are not cached (partial chunks can't be replayed meaningfully) but are still usage-tracked once complete. */
export async function* streamComplete(request: CompletionRequest) {
  let fullText = "";
  const start = performance.now();

  for await (const chunk of routeStream(request)) {
    fullText += chunk.delta;
    yield chunk;
  }

  // Usage/cost for streamed responses is estimated from character count
  // (~4 chars/token) since provider streaming APIs don't always return
  // exact token counts on the final chunk; products needing exact billing
  // figures should prefer `complete()` for AI-metered features.
  const estimatedOutputTokens = Math.ceil(fullText.length / 4);
  await recordAiUsage({
    feature: request.feature,
    organizationId: request.organizationId,
    userId: request.userId,
    response: {
      content: fullText,
      provider: "anthropic",
      model: "streamed",
      inputTokens: 0,
      outputTokens: estimatedOutputTokens,
      wasFallback: false,
      wasCacheHit: false,
      latencyMs: Math.round(performance.now() - start),
    },
    promptVersion: request.promptVersion,
  });
}

export async function embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
  const provider = getEmbeddingProvider();
  if (!provider.embed) {
    throw new Error(`Provider "${provider.name}" does not implement embed().`);
  }
  return provider.embed(request);
}
