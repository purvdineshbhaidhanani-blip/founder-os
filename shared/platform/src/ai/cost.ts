/**
 * Per-model pricing, in micro-cents per token (1 micro-cent = 1/1,000,000
 * of a cent) — precise enough for sub-cent-per-1K-token pricing without
 * floating point. Prices are the vendors' published per-million-token
 * rates as of this writing; update here as pricing changes, never
 * hardcoded per call site.
 */

interface ModelPricing {
  inputMicroCentsPerToken: number;
  outputMicroCentsPerToken: number;
}

const PRICING: Record<string, ModelPricing> = {
  "claude-sonnet-4-5": { inputMicroCentsPerToken: 300, outputMicroCentsPerToken: 1500 },
  "claude-opus-4-8": { inputMicroCentsPerToken: 1500, outputMicroCentsPerToken: 7500 },
  "claude-haiku-4-5-20251001": { inputMicroCentsPerToken: 100, outputMicroCentsPerToken: 500 },
  "gpt-4o": { inputMicroCentsPerToken: 250, outputMicroCentsPerToken: 1000 },
  "gpt-4o-mini": { inputMicroCentsPerToken: 15, outputMicroCentsPerToken: 60 },
  "text-embedding-3-small": { inputMicroCentsPerToken: 2, outputMicroCentsPerToken: 0 },
};

const FALLBACK_PRICING: ModelPricing = { inputMicroCentsPerToken: 300, outputMicroCentsPerToken: 1500 };

export function calculateCostMicroCents(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model] ?? FALLBACK_PRICING;
  return Math.round(inputTokens * pricing.inputMicroCentsPerToken + outputTokens * pricing.outputMicroCentsPerToken);
}

export function microCentsToDollars(microCents: number): number {
  return microCents / 1_000_000 / 100;
}
