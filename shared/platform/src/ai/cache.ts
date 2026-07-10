import { createHash } from "node:crypto";
import { getPlatformRedis } from "../db/redis.js";
import type { CompletionRequest, CompletionResponse } from "./types.js";

const CACHE_TTL_SECONDS = 60 * 60; // 1 hour — long enough to absorb retry/duplicate-render storms, short enough that stale AI output doesn't linger

function cacheKey(request: CompletionRequest): string {
  const material = JSON.stringify({ system: request.system, messages: request.messages, feature: request.feature });
  const hash = createHash("sha256").update(material).digest("hex");
  return `ai_cache:${request.feature}:${hash}`;
}

export async function getCachedCompletion(request: CompletionRequest): Promise<CompletionResponse | null> {
  if (!request.cacheable) return null;
  const raw = await getPlatformRedis().get(cacheKey(request));
  if (!raw) return null;
  const cached = JSON.parse(raw) as CompletionResponse;
  return { ...cached, wasCacheHit: true, latencyMs: 0 };
}

export async function setCachedCompletion(request: CompletionRequest, response: CompletionResponse): Promise<void> {
  if (!request.cacheable) return;
  await getPlatformRedis().set(cacheKey(request), JSON.stringify(response), "EX", CACHE_TTL_SECONDS);
}
