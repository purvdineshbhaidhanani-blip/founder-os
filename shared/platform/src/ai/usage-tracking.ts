import { getPlatformDb, currentAppId } from "../db/index.js";
import { calculateCostMicroCents, microCentsToDollars } from "./cost.js";
import type { CompletionResponse } from "./types.js";

export async function recordAiUsage(params: {
  feature: string;
  organizationId?: string;
  userId?: string;
  response: CompletionResponse;
  promptVersion?: string;
}): Promise<void> {
  const costMicroCents = calculateCostMicroCents(params.response.model, params.response.inputTokens, params.response.outputTokens);

  await getPlatformDb().aiUsageLog.create({
    data: {
      appId: currentAppId(),
      organizationId: params.organizationId,
      userId: params.userId,
      feature: params.feature,
      provider: params.response.provider,
      model: params.response.model,
      promptVersion: params.promptVersion,
      inputTokens: params.response.inputTokens,
      outputTokens: params.response.outputTokens,
      costMicroCents,
      latencyMs: params.response.latencyMs,
      wasFallback: params.response.wasFallback,
      wasCacheHit: params.response.wasCacheHit,
    },
  });
}

export interface AiUsageSummary {
  feature: string;
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostDollars: number;
  fallbackRate: number;
  cacheHitRate: number;
}

/** Aggregates usage for cost dashboards — per organization, optionally scoped to a date range. */
export async function summarizeAiUsage(params: {
  organizationId: string;
  since?: Date;
  until?: Date;
}): Promise<AiUsageSummary[]> {
  const logs = await getPlatformDb().aiUsageLog.findMany({
    where: {
      organizationId: params.organizationId,
      createdAt: {
        ...(params.since ? { gte: params.since } : {}),
        ...(params.until ? { lte: params.until } : {}),
      },
    },
  });

  const byFeature = new Map<string, typeof logs>();
  for (const log of logs) {
    const existing = byFeature.get(log.feature) ?? [];
    existing.push(log);
    byFeature.set(log.feature, existing);
  }

  return Array.from(byFeature.entries()).map(([feature, entries]) => {
    const totalCostMicroCents = entries.reduce((sum, e) => sum + e.costMicroCents, 0);
    return {
      feature,
      totalCalls: entries.length,
      totalInputTokens: entries.reduce((sum, e) => sum + e.inputTokens, 0),
      totalOutputTokens: entries.reduce((sum, e) => sum + e.outputTokens, 0),
      totalCostDollars: microCentsToDollars(totalCostMicroCents),
      fallbackRate: entries.filter((e) => e.wasFallback).length / entries.length,
      cacheHitRate: entries.filter((e) => e.wasCacheHit).length / entries.length,
    };
  });
}
