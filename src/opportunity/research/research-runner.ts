import { generateId, nowIso } from "../../utils/id.js";
import { CollectorRegistry } from "../collector.js";
import {
  GitHubIssuesCollector,
  GitHubDiscussionsCollector,
  HackerNewsCollector,
  StackOverflowCollector,
  YouTubeCollector,
  ProfessionalBlogsCollector,
} from "../collectors/index.js";
import { extractSignals } from "../signal-extractor.js";
import { clusterSignals } from "../repetition-engine.js";
import { OpportunityStore } from "../opportunity-store.js";
import type { CollectedItem, CollectorSource } from "../types.js";
import { loadCredentials } from "./env-loader.js";
import { deduplicate } from "./deduplicator.js";
import { ResearchStore } from "./research-store.js";
import { AnalysisPipeline } from "./analysis-pipeline.js";
import { SessionPersistence } from "./session-persistence.js";
import type {
  ResearchPeriod,
  ResearchPeriodPreset,
  ResearchSession,
  SourceStats,
} from "./types.js";
import { researchPeriodFromPreset, researchPeriodCustom } from "./types.js";
import type { AnalysisResult } from "./analysis-types.js";

// ---------------------------------------------------------------------------
// Research Runner — production research session executor
// ---------------------------------------------------------------------------

export interface ResearchRunnerConfig {
  /** Optional explicit period. If omitted, use preset. */
  period?: ResearchPeriod;
  /** Shorthand preset. Default: "30d". */
  preset?: ResearchPeriodPreset;
  /** Custom since/until (overrides preset). */
  since?: string;
  until?: string;
  /** Max items per source. Default: 30. */
  limitPerSource?: number;
  /** Working directory used to find .env.local. Default: process.cwd(). */
  cwd?: string;
  /** Min signal cluster size to promote to Opportunity. Default: 1. */
  minClusterSize?: number;
  /** Called when a source finishes. */
  onSourceComplete?: (source: CollectorSource, stats: SourceStats) => void;
  /** Whether to run the full analysis pipeline after collection. Default: true. */
  runAnalysis?: boolean;
}

export interface ResearchRunResult {
  session: ResearchSession;
  analysis: AnalysisResult | null;
}

export class ResearchRunner {
  private readonly registry: CollectorRegistry;
  private readonly opportunityStore: OpportunityStore;
  readonly researchStore: ResearchStore;
  readonly analysisPipeline: AnalysisPipeline;
  private readonly persistence: SessionPersistence;

  constructor(
    opportunityStore?: OpportunityStore,
    researchStore?: ResearchStore,
    analysisPipeline?: AnalysisPipeline,
    cwd?: string,
  ) {
    this.opportunityStore = opportunityStore ?? new OpportunityStore();
    this.researchStore = researchStore ?? new ResearchStore();
    this.analysisPipeline = analysisPipeline ?? new AnalysisPipeline();
    this.persistence = new SessionPersistence(cwd ?? process.cwd());
    this.registry = new CollectorRegistry();
    this.registerCollectors();
  }

  private registerCollectors(): void {
    // The 5 production connectors required by Phase 6A:
    this.registry.register(new GitHubIssuesCollector());
    this.registry.register(new GitHubDiscussionsCollector());
    this.registry.register(new HackerNewsCollector());       // no auth needed
    this.registry.register(new StackOverflowCollector());    // optional key
    this.registry.register(new YouTubeCollector());          // needs YOUTUBE_API_KEY
    this.registry.register(new ProfessionalBlogsCollector()); // RSS, no auth
  }

  async run(config: ResearchRunnerConfig = {}): Promise<ResearchSession> {
    const { session } = await this.runFull(config);
    return session;
  }

  async runFull(config: ResearchRunnerConfig = {}): Promise<ResearchRunResult> {
    const sessionId = generateId("session");
    const startedAt = nowIso();
    const startMs = Date.now();

    // Resolve period
    const period = config.period
      ?? (config.since
        ? researchPeriodCustom(config.since, config.until)
        : researchPeriodFromPreset(config.preset ?? "30d"));

    // Load credentials from .env.local / process.env
    const creds = loadCredentials(config.cwd);

    // Build per-collector config options
    const limitPerSource = config.limitPerSource ?? 30;
    const collectorOptions = buildCollectorOptions(creds);

    const session: ResearchSession = {
      sessionId,
      period,
      startedAt,
      completedAt: null,
      status: "running",
      totalItemsCollected: 0,
      totalItemsAfterDedup: 0,
      totalSignalsExtracted: 0,
      totalOpportunitiesUpserted: 0,
      durationMs: 0,
      sourceStats: [],
      successfulSources: [],
      failedSources: [],
      errors: [],
    };

    this.researchStore.save(session);

    const allItems: CollectedItem[] = [];
    const sourceStatsList: SourceStats[] = [];

    // Run all collectors in parallel — failure in one does not stop others
    const collectors = this.registry.list();
    const tasks = collectors.map(async (collector) => {
      const t0 = Date.now();
      const opts = collectorOptions[collector.source] ?? {};
      const credentialed = hasCredential(collector.source, creds);

      try {
        const result = await collector.collect({
          since: period.since,
          limit: limitPerSource,
          options: opts,
        });

        const stats: SourceStats = {
          source: collector.source,
          itemsCollected: result.items.length,
          itemsDeduplicated: 0,  // filled after global dedup
          signalsExtracted: 0,    // filled after signal extraction
          errors: result.errors,
          durationMs: Date.now() - t0,
          credentialed,
        };

        allItems.push(...result.items);
        sourceStatsList.push(stats);
        config.onSourceComplete?.(collector.source, stats);

        if (result.errors.length > 0 && result.items.length === 0) {
          session.failedSources.push(collector.source);
        } else {
          session.successfulSources.push(collector.source);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const stats: SourceStats = {
          source: collector.source,
          itemsCollected: 0,
          itemsDeduplicated: 0,
          signalsExtracted: 0,
          errors: [{ code: "UNCAUGHT_ERROR", message: errMsg }],
          durationMs: Date.now() - t0,
          credentialed,
        };
        sourceStatsList.push(stats);
        session.errors.push(`${collector.source}: ${errMsg}`);
        session.failedSources.push(collector.source);
        config.onSourceComplete?.(collector.source, stats);
      }
    });

    await Promise.all(tasks);

    // Deduplicate across all sources
    const { items: uniqueItems, duplicatesRemoved } = deduplicate(allItems);

    // Extract signals from unique items
    const allSignals = uniqueItems.flatMap(extractSignals);

    // Update per-source dedup + signal counts (approximate by proportion)
    for (const stats of sourceStatsList) {
      const fraction = allItems.length > 0 ? stats.itemsCollected / allItems.length : 0;
      stats.itemsDeduplicated = Math.round(duplicatesRemoved * fraction);
      const remaining = stats.itemsCollected - stats.itemsDeduplicated;
      stats.signalsExtracted = Math.round(allSignals.length * (allItems.length > 0 ? remaining / uniqueItems.length : 0));
    }

    // Cluster and store opportunities
    const clusters = clusterSignals(allSignals, config.minClusterSize ?? 1);
    const upserted = clusters.map((c) => this.opportunityStore.upsert(c, uniqueItems));

    // Finalize session
    const durationMs = Date.now() - startMs;
    session.totalItemsCollected = allItems.length;
    session.totalItemsAfterDedup = uniqueItems.length;
    session.totalSignalsExtracted = allSignals.length;
    session.totalOpportunitiesUpserted = upserted.length;
    session.durationMs = durationMs;
    session.sourceStats = sourceStatsList;
    session.completedAt = nowIso();
    session.status = session.failedSources.length === collectors.length
      ? "failed"
      : session.failedSources.length > 0
        ? "partial"
        : "completed";

    this.researchStore.save(session);

    // Run full analysis pipeline (unless explicitly disabled)
    let analysis: AnalysisResult | null = null;
    if (config.runAnalysis !== false && upserted.length > 0) {
      analysis = await this.analysisPipeline.run(this.opportunityStore, sessionId);
    }

    // Persist to disk
    this.persistence.save(session, analysis);

    return { session, analysis };
  }

  getOpportunityStore(): OpportunityStore {
    return this.opportunityStore;
  }

  getPersistence(): SessionPersistence {
    return this.persistence;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CollectorOptions extends Record<string, unknown> {
  token?: string;
  apiKey?: string;
  key?: string;
}

function buildCollectorOptions(creds: ReturnType<typeof loadCredentials>): Partial<Record<CollectorSource, CollectorOptions>> {
  const opts: Partial<Record<CollectorSource, CollectorOptions>> = {};
  if (creds.githubToken) {
    opts["github-issues"] = { token: creds.githubToken };
    opts["github-discussions"] = { token: creds.githubToken };
  }
  if (creds.youtubeApiKey) {
    opts["youtube"] = { apiKey: creds.youtubeApiKey };
  }
  if (creds.stackexchangeApiKey) {
    opts["stackoverflow"] = { key: creds.stackexchangeApiKey };
  }
  return opts;
}

function hasCredential(source: CollectorSource, creds: ReturnType<typeof loadCredentials>): boolean {
  if (source === "github-issues" || source === "github-discussions") return !!creds.githubToken;
  if (source === "youtube") return !!creds.youtubeApiKey;
  if (source === "stackoverflow") return !!creds.stackexchangeApiKey;
  return true;  // HN, blogs, forums need no credential
}
