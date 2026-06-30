import { CollectorRegistry } from "./collector.js";
import type { CollectorConfig } from "./collector.js";
import {
  RedditCollector,
  GitHubIssuesCollector,
  GitHubDiscussionsCollector,
  StackOverflowCollector,
  ProductHuntCollector,
  HackerNewsCollector,
  G2Collector,
  CapterraCollector,
  TrustpilotCollector,
  GooglePlayCollector,
  AppleStoreCollector,
  YouTubeCollector,
  ProfessionalBlogsCollector,
  ProfessionalForumsCollector,
} from "./collectors/index.js";
import { extractSignals } from "./signal-extractor.js";
import { clusterSignals } from "./repetition-engine.js";
import { OpportunityStore } from "./opportunity-store.js";
import type { CollectedItem, CollectorSource, Opportunity, Signal } from "./types.js";

// ---------------------------------------------------------------------------
// Filters — exclude non-professional content
// ---------------------------------------------------------------------------

const EXCLUDED_TERMS = [
  /\b(meme|viral|celebrity|kardashian|politics?|democrat|republican|gaming|fortnite|minecraft|anime|tiktok|instagram reels?|lifestyle)\b/i,
];

function isBusinessRelevant(item: CollectedItem): boolean {
  return !EXCLUDED_TERMS.some((re) => re.test(item.rawContent));
}

// ---------------------------------------------------------------------------
// Run configuration
// ---------------------------------------------------------------------------

export interface EngineRunConfig {
  /** Sources to run. Runs all registered sources when omitted. */
  sources?: CollectorSource[];
  /** Passed to each collector. */
  collectorConfig?: CollectorConfig;
  /** Minimum cluster size to promote to an Opportunity. Default: 1. */
  minClusterSize?: number;
  /** Called after each source completes. */
  onSourceComplete?: (source: CollectorSource, itemCount: number, errorCount: number) => void;
}

export interface EngineRunResult {
  totalItemsCollected: number;
  totalSignalsExtracted: number;
  totalOpportunitiesUpserted: number;
  sourceResults: SourceRunResult[];
  opportunities: Opportunity[];
  durationMs: number;
}

export interface SourceRunResult {
  source: CollectorSource;
  itemsCollected: number;
  signalsExtracted: number;
  errors: number;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// OpportunityEngine — top-level orchestrator
// ---------------------------------------------------------------------------

export class OpportunityEngine {
  readonly registry: CollectorRegistry;
  readonly store: OpportunityStore;

  constructor() {
    this.store = new OpportunityStore();
    this.registry = new CollectorRegistry();
    this.registerDefaultCollectors();
  }

  private registerDefaultCollectors(): void {
    this.registry.register(new RedditCollector());
    this.registry.register(new GitHubIssuesCollector());
    this.registry.register(new GitHubDiscussionsCollector());
    this.registry.register(new StackOverflowCollector());
    this.registry.register(new ProductHuntCollector());
    this.registry.register(new HackerNewsCollector());
    this.registry.register(new G2Collector());
    this.registry.register(new CapterraCollector());
    this.registry.register(new TrustpilotCollector());
    this.registry.register(new GooglePlayCollector());
    this.registry.register(new AppleStoreCollector());
    this.registry.register(new YouTubeCollector());
    this.registry.register(new ProfessionalBlogsCollector());
    this.registry.register(new ProfessionalForumsCollector());
  }

  /**
   * Run one full collection cycle across all (or specified) sources.
   * 1. Collect items from each source in parallel.
   * 2. Filter non-business content.
   * 3. Extract signals from each item.
   * 4. Cluster signals by problem fingerprint.
   * 5. Upsert clusters as Opportunities.
   */
  async run(config: EngineRunConfig = {}): Promise<EngineRunResult> {
    const start = Date.now();
    const collectors = config.sources
      ? config.sources.flatMap((s) => (this.registry.get(s) ? [this.registry.get(s)!] : []))
      : this.registry.list();

    const sourceResults: SourceRunResult[] = [];
    const allItems: CollectedItem[] = [];
    const allSignals: Signal[] = [];

    // Collect from all sources in parallel
    const collectionTasks = collectors.map(async (collector) => {
      const t0 = Date.now();
      const result = await collector.collect(config.collectorConfig ?? {});
      const relevant = result.items.filter(isBusinessRelevant);
      const signals = relevant.flatMap(extractSignals);

      allItems.push(...relevant);
      allSignals.push(...signals);

      const sr: SourceRunResult = {
        source: collector.source,
        itemsCollected: relevant.length,
        signalsExtracted: signals.length,
        errors: result.errors.length,
        durationMs: Date.now() - t0,
      };
      sourceResults.push(sr);
      config.onSourceComplete?.(collector.source, relevant.length, result.errors.length);
    });

    await Promise.all(collectionTasks);

    // Cluster and upsert opportunities
    const clusters = clusterSignals(allSignals, config.minClusterSize ?? 1);
    const upserted: Opportunity[] = [];
    for (const cluster of clusters) {
      const opp = this.store.upsert(cluster, allItems);
      upserted.push(opp);
    }

    return {
      totalItemsCollected: allItems.length,
      totalSignalsExtracted: allSignals.length,
      totalOpportunitiesUpserted: upserted.length,
      sourceResults,
      opportunities: this.store.list(),
      durationMs: Date.now() - start,
    };
  }

  opportunities(): Opportunity[] {
    return this.store.list();
  }
}
