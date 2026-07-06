import { createHash } from "node:crypto";
import { generateId, nowIso } from "../utils/id.js";
import { createLogger } from "../utils/logger.js";
import type { ArtifactManager } from "../runtime/artifacts/manager.js";
import type { MemoryEngine } from "../runtime/memory/engine.js";
import type { EventBus } from "../runtime/events/bus.js";
import { ALL_MONITOR_PROVIDERS } from "./providers/index.js";
import { diffSnapshots } from "./diff.js";
import type {
  MonitorProvider,
  MonitorProviderInfo,
  MonitorProviderRunResult,
  MonitorRunInput,
  MonitorRunResult,
  MonitorSnapshot,
} from "./types.js";

const logger = createLogger("monitoring.engine");

/**
 * Namespace snapshots/runs are persisted under. `MemoryNamespace` has no
 * dedicated "monitoring" member, so we reuse the durable "project" namespace
 * and disambiguate via a stable, prefixed `key` + the "monitoring" tag —
 * exactly how `ResearchEngine` persists its sessions under "project".
 */
const SNAPSHOT_TAG = "monitoring-snapshot";
const RUN_TAG = "monitoring-run";

export interface MonitorEngineOptions {
  memory: MemoryEngine;
  artifacts: ArtifactManager;
  bus?: EventBus;
  /** Override the provider set (used by tests). Defaults to ALL_MONITOR_PROVIDERS. */
  providers?: MonitorProvider[];
}

/**
 * Server-facing orchestration over the existing, unchanged monitoring
 * modules: it selects providers, calls their never-throwing `fetch`, loads
 * the previously-persisted snapshot, runs the pure `diffSnapshots` engine to
 * compute "what changed since last check", persists the new snapshot, and
 * returns a fully-typed `MonitorRunResult`.
 *
 * It owns NO collection or diff logic of its own — providers and `diff.ts`
 * are reused verbatim. The only new concern here is persistence + fan-out,
 * which deliberately mirrors `ResearchEngine` (memory + artifacts, per-source
 * isolation, one artifact per run).
 */
export class MonitorEngine {
  private readonly memory: MemoryEngine;
  private readonly artifacts: ArtifactManager;
  private readonly bus?: EventBus;
  private readonly providers: MonitorProvider[];

  constructor(options: MonitorEngineOptions) {
    this.memory = options.memory;
    this.artifacts = options.artifacts;
    this.bus = options.bus;
    this.providers = options.providers ?? ALL_MONITOR_PROVIDERS;
  }

  /** Serializable descriptors for every configured provider. */
  listProviders(): MonitorProviderInfo[] {
    return this.providers.map((provider) => ({
      id: provider.id,
      category: provider.category,
      keyless: provider.keyless,
    }));
  }

  /** Stable, collision-resistant memory id for one provider/query snapshot. */
  private snapshotId(providerId: string, query: string): string {
    const digest = createHash("sha1").update(`${providerId}::${query}`).digest("hex").slice(0, 16);
    return `mon_${digest}`;
  }

  private snapshotKey(providerId: string, query: string): string {
    return `monitor:${providerId}:${query}`;
  }

  /** Loads the most recently persisted snapshot for a provider/query pair, or undefined on the first run. */
  async getSnapshot(providerId: string, query: string): Promise<MonitorSnapshot | undefined> {
    const entries = await this.memory.recall({
      namespace: "project",
      key: this.snapshotKey(providerId, query),
      tag: SNAPSHOT_TAG,
    });
    return entries[0]?.data as MonitorSnapshot | undefined;
  }

  /** Returns which providers a run would select, applying the same rules as `run`. */
  private selectProviders(input: MonitorRunInput): MonitorProvider[] {
    if (input.providerIds && input.providerIds.length > 0) {
      const wanted = new Set(input.providerIds);
      return this.providers.filter((provider) => wanted.has(provider.id));
    }
    if (input.category) {
      return this.providers.filter((provider) => provider.category === input.category);
    }
    return [...this.providers];
  }

  /**
   * Runs the selected providers for `input.query`, diffs each against its
   * last persisted snapshot, persists the fresh snapshots, and returns a
   * typed result. Providers never throw; each provider is isolated, so one
   * failing provider never aborts the run.
   */
  async run(input: MonitorRunInput): Promise<MonitorRunResult> {
    const runId = generateId("monrun");
    const startedAt = nowIso();
    const windowDays = input.windowDays ?? 30;
    const query = input.query.trim();

    const selected = this.selectProviders(input);
    logger.info("monitoring run starting", {
      runId,
      query,
      windowDays,
      providers: selected.map((provider) => provider.id),
    });

    const results: MonitorProviderRunResult[] = [];

    for (const provider of selected) {
      const previous = await this.getSnapshot(provider.id, query);
      let result;
      try {
        result = await provider.fetch(query, windowDays);
      } catch (error) {
        // Providers are contractually never-throw, but guard anyway so a
        // rogue rejection degrades to a recorded failure, not a crashed run.
        results.push({
          providerId: provider.id,
          category: provider.category,
          ok: false,
          firstRun: previous === undefined,
          itemCount: 0,
          changes: [],
          error: error instanceof Error ? error.message : "unknown monitor provider error",
          reason: "unknown-error",
        });
        continue;
      }

      if (!result.ok) {
        results.push({
          providerId: provider.id,
          category: provider.category,
          ok: false,
          firstRun: previous === undefined,
          itemCount: 0,
          changes: [],
          error: result.error,
          reason: result.reason,
        });
        continue;
      }

      const changes = diffSnapshots(previous, result.snapshot);
      // Persist the fresh snapshot under a stable id so the NEXT run diffs
      // against it. Passing `opts.id` makes `remember` overwrite in place
      // rather than accumulate a new entry per run.
      await this.memory.remember("project", this.snapshotKey(provider.id, query), result.snapshot, {
        id: this.snapshotId(provider.id, query),
        tags: [SNAPSHOT_TAG, provider.id],
      });

      results.push({
        providerId: provider.id,
        category: provider.category,
        ok: true,
        firstRun: previous === undefined,
        itemCount: result.snapshot.items.length,
        changes,
        ...(result.partialFailure ? { partialFailure: result.partialFailure } : {}),
      });
    }

    const completedAt = nowIso();
    const providersRun = results.filter((r) => r.ok).map((r) => r.providerId);
    const providersFailed = results.filter((r) => !r.ok).map((r) => r.providerId);
    const totalChanges = results.reduce((sum, r) => sum + r.changes.length, 0);

    const runResult: MonitorRunResult = {
      runId,
      query,
      windowDays,
      startedAt,
      completedAt,
      durationMs: Date.parse(completedAt) - Date.parse(startedAt),
      providersRun,
      providersFailed,
      totalChanges,
      results,
    };

    const artifact = await this.artifacts.register({
      name: `Monitoring run ${runId}`,
      kind: "report",
      owner: "monitor-engine",
      content: JSON.stringify(runResult, null, 2),
      metadata: { runId, query, windowDays, tags: ["monitoring"] },
    });
    runResult.artifactId = artifact.id;

    await this.memory.remember("project", `monitor-run:${runId}`, runResult, {
      id: runId,
      tags: [RUN_TAG],
    });

    void this.bus?.publish({
      name: "monitoring.run.completed",
      source: "monitor-engine",
      payload: { runId, artifactId: artifact.id, totalChanges },
    });

    logger.info("monitoring run complete", { runId, providersRun, providersFailed, totalChanges });
    return runResult;
  }

  /** Most recent runs, newest first (bounded by `limit`). */
  async listRuns(limit = 20): Promise<MonitorRunResult[]> {
    const entries = await this.memory.recall({ namespace: "project", tag: RUN_TAG });
    return entries
      .map((entry) => entry.data as MonitorRunResult)
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
      .slice(0, limit);
  }
}
