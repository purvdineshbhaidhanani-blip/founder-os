import type { TokenUsage } from "./types.js";

export interface ModelPricing {
  /** USD per 1M input tokens. */
  inputPerMillion: number;
  /** USD per 1M output tokens. */
  outputPerMillion: number;
}

export interface UsageRecord {
  model: string;
  usage: TokenUsage;
  costUsd: number;
  timestamp: string;
  /** Free-form tag, e.g. a tenant id, feature name, or request id, for attribution. */
  tag?: string;
}

export interface TokenAccountant {
  record(model: string, usage: TokenUsage, tag?: string): UsageRecord;
  totalCostUsd(filter?: { model?: string; tag?: string }): number;
  totalUsage(filter?: { model?: string; tag?: string }): TokenUsage;
  history(filter?: { model?: string; tag?: string }): UsageRecord[];
}

function matchesFilter(record: UsageRecord, filter?: { model?: string; tag?: string }): boolean {
  if (!filter) return true;
  if (filter.model && record.model !== filter.model) return false;
  if (filter.tag && record.tag !== filter.tag) return false;
  return true;
}

/**
 * Tracks token usage and cost across every completion, keyed by model and an
 * optional attribution tag. No vendor lock-in: pricing tables are supplied by
 * the caller, not hardcoded to a single provider's price list.
 */
export class InMemoryTokenAccountant implements TokenAccountant {
  private readonly records: UsageRecord[] = [];

  constructor(private readonly pricing: Record<string, ModelPricing> = {}) {}

  private cost(model: string, usage: TokenUsage): number {
    const price = this.pricing[model];
    if (!price) return 0;
    return (
      (usage.inputTokens / 1_000_000) * price.inputPerMillion +
      (usage.outputTokens / 1_000_000) * price.outputPerMillion
    );
  }

  record(model: string, usage: TokenUsage, tag?: string): UsageRecord {
    const record: UsageRecord = {
      model,
      usage,
      costUsd: this.cost(model, usage),
      timestamp: new Date().toISOString(),
      tag,
    };
    this.records.push(record);
    return record;
  }

  totalCostUsd(filter?: { model?: string; tag?: string }): number {
    return this.records
      .filter((r) => matchesFilter(r, filter))
      .reduce((sum, r) => sum + r.costUsd, 0);
  }

  totalUsage(filter?: { model?: string; tag?: string }): TokenUsage {
    return this.records.filter((r) => matchesFilter(r, filter)).reduce(
      (acc, r) => ({
        inputTokens: acc.inputTokens + r.usage.inputTokens,
        outputTokens: acc.outputTokens + r.usage.outputTokens,
        totalTokens: acc.totalTokens + r.usage.totalTokens,
      }),
      { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    );
  }

  history(filter?: { model?: string; tag?: string }): UsageRecord[] {
    return this.records.filter((r) => matchesFilter(r, filter));
  }
}
