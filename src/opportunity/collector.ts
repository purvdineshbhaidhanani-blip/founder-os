import type { CollectedItem, CollectorSource } from "./types.js";

// ---------------------------------------------------------------------------
// Common collector interface — every source adapter implements this.
// No source-specific logic lives outside the adapter file.
// ---------------------------------------------------------------------------

export interface CollectorConfig {
  /** Maximum items to fetch per run. Undefined = source default. */
  limit?: number;
  /** ISO timestamp; only fetch items newer than this. */
  since?: string;
  /** Extra source-specific options (API keys, subreddits, queries, etc.). */
  options?: Record<string, unknown>;
}

export interface CollectorResult {
  source: CollectorSource;
  items: CollectedItem[];
  /** Opaque cursor for the next page; undefined when exhausted. */
  nextCursor?: string;
  fetchedAt: string;
  errors: CollectorError[];
}

export interface CollectorError {
  code: string;
  message: string;
  context?: Record<string, unknown>;
}

/**
 * Every source collector must implement ICollector.
 * Consumers only ever see this interface — never concrete adapters.
 */
export interface ICollector {
  readonly source: CollectorSource;
  readonly displayName: string;

  /**
   * Fetch items from the source. Implementations must:
   * - Return normalised CollectedItem objects (never raw source format).
   * - Never throw — surface errors via CollectorResult.errors instead.
   * - Respect config.limit and config.since when the source supports them.
   */
  collect(config?: CollectorConfig): Promise<CollectorResult>;
}

// ---------------------------------------------------------------------------
// Registry — lets the engine look up collectors by source id.
// ---------------------------------------------------------------------------

export class CollectorRegistry {
  private readonly collectors = new Map<CollectorSource, ICollector>();

  register(collector: ICollector): void {
    this.collectors.set(collector.source, collector);
  }

  get(source: CollectorSource): ICollector | undefined {
    return this.collectors.get(source);
  }

  list(): ICollector[] {
    return [...this.collectors.values()];
  }

  sources(): CollectorSource[] {
    return [...this.collectors.keys()];
  }
}
