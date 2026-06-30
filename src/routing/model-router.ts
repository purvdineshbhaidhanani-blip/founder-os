export type ModelQualityTier = "low" | "medium" | "high";

export interface ModelDefinition {
  id: string;
  provider: string;
  name: string;
  costPerMillionInputTokensCents: number;
  costPerMillionOutputTokensCents: number;
  averageLatencyMs: number;
  qualityTier: ModelQualityTier;
  enabled: boolean;
  /** Fallback model id if this one is unavailable. */
  fallback?: string;
  /** Task kinds this model excels at. */
  goodFor?: string[];
}

export interface RouteCriteria {
  taskKind?: string;
  minQuality?: ModelQualityTier;
  maxLatencyMs?: number;
  maxInputCostCents?: number;
  prefer?: "cheapest" | "fastest" | "best-quality";
}

export interface RouteDecision {
  provider: string;
  model: string;
  modelId: string;
}

const TIER_RANK: Record<ModelQualityTier, number> = { low: 1, medium: 2, high: 3 };

/**
 * Model Router — provider-agnostic model selection. Holds a registry of
 * known models with their cost/latency/quality profiles and routes a
 * RouteCriteria to the best match using the chosen preference. Supports
 * fallback chains so the orchestrator can degrade gracefully when a model is
 * unavailable.
 */
export class ModelRouter {
  private models = new Map<string, ModelDefinition>();

  register(model: ModelDefinition): void { this.models.set(model.id, model); }
  unregister(id: string): void { this.models.delete(id); }
  get(id: string): ModelDefinition | undefined { return this.models.get(id); }
  list(): ModelDefinition[] { return [...this.models.values()].filter((m) => m.enabled); }

  route(criteria: RouteCriteria = {}): RouteDecision | undefined {
    const minRank = TIER_RANK[criteria.minQuality ?? "low"];
    let candidates = this.list().filter((model) => TIER_RANK[model.qualityTier] >= minRank);
    if (criteria.taskKind) {
      const filtered = candidates.filter((model) => model.goodFor?.includes(criteria.taskKind!));
      if (filtered.length > 0) candidates = filtered;
    }
    if (criteria.maxLatencyMs) {
      candidates = candidates.filter((model) => model.averageLatencyMs <= criteria.maxLatencyMs!);
    }
    if (criteria.maxInputCostCents) {
      candidates = candidates.filter(
        (model) => model.costPerMillionInputTokensCents <= criteria.maxInputCostCents!,
      );
    }
    if (candidates.length === 0) return undefined;

    const compare = this.comparator(criteria.prefer ?? "cheapest");
    candidates.sort(compare);
    const best = candidates[0]!;
    return { provider: best.provider, model: best.name, modelId: best.id };
  }

  fallbackChain(id: string): string[] {
    const chain: string[] = [];
    const seen = new Set<string>();
    let current: string | undefined = id;
    while (current && !seen.has(current)) {
      seen.add(current);
      const model = this.models.get(current);
      if (!model) break;
      chain.push(model.id);
      current = model.fallback;
    }
    return chain;
  }

  private comparator(prefer: NonNullable<RouteCriteria["prefer"]>): (a: ModelDefinition, b: ModelDefinition) => number {
    if (prefer === "fastest") return (a, b) => a.averageLatencyMs - b.averageLatencyMs;
    if (prefer === "best-quality") return (a, b) => TIER_RANK[b.qualityTier] - TIER_RANK[a.qualityTier];
    return (a, b) => a.costPerMillionInputTokensCents - b.costPerMillionInputTokensCents;
  }
}
