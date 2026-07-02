import { generateId, nowIso } from "../utils/id.js";
import { createLogger } from "../utils/logger.js";
import { makeInsight } from "../intelligence/reality-guard.js";
import type { Insight, Source } from "../intelligence/types.js";
import type { ConnectorRegistry } from "../connectors/registry.js";
import type { ArtifactManager } from "../runtime/artifacts/manager.js";
import type { MemoryEngine } from "../runtime/memory/engine.js";
import type { EventBus } from "../runtime/events/bus.js";
import { ALL_SOURCE_ADAPTERS } from "./sources/index.js";
import { classifyException } from "./sources/classify.js";
import { buildFounderReport } from "./report.js";
import { dedupeItems } from "./dedup.js";
import type {
  Opportunity,
  RawResearchItem,
  ResearchProgressEvent,
  ResearchSession,
  SourceAdapter,
  SourceFailureReason,
} from "./types.js";

const logger = createLogger("research.engine");

/** Thrown when zero sources are eligible to run — lists exactly which required env vars are missing. */
export class MissingKeysError extends Error {
  readonly missingEnv: string[];

  constructor(missingEnv: string[]) {
    super(
      missingEnv.length > 0
        ? `No research sources are eligible to run. Missing: ${missingEnv.join(", ")}`
        : "No research sources are eligible to run.",
    );
    this.name = "MissingKeysError";
    this.missingEnv = missingEnv;
  }
}

export interface ResearchEngineOptions {
  connectors: ConnectorRegistry;
  artifacts: ArtifactManager;
  memory: MemoryEngine;
  bus?: EventBus;
  /** Override the adapter set (used by tests). Defaults to ALL_SOURCE_ADAPTERS. */
  adapters?: SourceAdapter[];
}

const KEYED_SOURCE_IDS = new Set(["github", "youtube", "stackexchange"]);

function keywordsOf(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
}

/** Simple keyword-overlap grouping — intentionally not full NLP/clustering. */
function aggregateOpportunities(items: RawResearchItem[]): Opportunity[] {
  const groups: Array<{ keywords: Set<string>; items: RawResearchItem[] }> = [];

  for (const item of items) {
    const itemKeywords = new Set(keywordsOf(item.title));
    let matched: { keywords: Set<string>; items: RawResearchItem[] } | undefined;

    for (const group of groups) {
      let overlap = 0;
      for (const keyword of itemKeywords) if (group.keywords.has(keyword)) overlap += 1;
      const minSize = Math.min(itemKeywords.size, group.keywords.size) || 1;
      if (overlap / minSize >= 0.5 && overlap > 0) {
        matched = group;
        break;
      }
    }

    if (matched) {
      matched.items.push(item);
      for (const keyword of itemKeywords) matched.keywords.add(keyword);
    } else {
      groups.push({ keywords: itemKeywords, items: [item] });
    }
  }

  return groups
    .map((group) => {
      const supportingItems = group.items;
      const sourceIds = [...new Set(supportingItems.map((item) => item.sourceId))];
      const title = supportingItems[0]?.title ?? "Untitled opportunity";
      return {
        id: generateId("opp"),
        title,
        summary: `${supportingItems.length} related item(s) across ${sourceIds.length} source(s): ${[...group.keywords].slice(0, 6).join(", ")}`,
        keywords: [...group.keywords],
        supportingItems,
        sourceIds,
      } satisfies Opportunity;
    })
    .sort((a, b) => b.supportingItems.length - a.supportingItems.length);
}

function itemsToSources(items: RawResearchItem[]): Source[] {
  return items.slice(0, 10).map((item) => ({
    url: item.url,
    title: item.title,
    kind: "secondary" as const,
    fetchedAt: nowIso(),
    snippet: item.snippet,
  }));
}

/**
 * Fans research out across every eligible source adapter, aggregates the raw
 * results into opportunities, and produces a founder-facing report backed by
 * Reality Guard confidence scoring. Persists the session as an artifact and
 * indexes it in project memory.
 */
export class ResearchEngine {
  private readonly connectors: ConnectorRegistry;
  private readonly artifacts: ArtifactManager;
  private readonly memory: MemoryEngine;
  private readonly bus?: EventBus;
  private readonly adapters: SourceAdapter[];

  constructor(options: ResearchEngineOptions) {
    this.connectors = options.connectors;
    this.artifacts = options.artifacts;
    this.memory = options.memory;
    this.bus = options.bus;
    this.adapters = options.adapters ?? ALL_SOURCE_ADAPTERS;
  }

  private isEligible(adapter: SourceAdapter): boolean {
    if (adapter.keyless) return true;
    return this.connectors.get(adapter.id)?.status === "configured";
  }

  /** Reads which required env vars are missing from the registry's own evaluation (never re-reads process.env directly, so it stays consistent with whatever env the registry was constructed/refreshed with). */
  private missingEnvForSkipped(adapter: SourceAdapter): string[] {
    const record = this.connectors.get(adapter.id);
    if (!record || record.status === "configured") return [];
    const prefix = "Missing: ";
    if (record.notes?.startsWith(prefix)) {
      return record.notes.slice(prefix.length).split(", ").filter(Boolean);
    }
    return [];
  }

  async run(
    windowDays: number,
    onProgress: (event: ResearchProgressEvent) => void = () => undefined,
    topic?: string,
  ): Promise<ResearchSession> {
    const sessionId = generateId("research");
    const startedAt = nowIso();

    const eligible: SourceAdapter[] = [];
    const skipped: Array<{ id: string; reason: string }> = [];
    const allMissingEnv: string[] = [];

    for (const adapter of this.adapters) {
      if (this.isEligible(adapter)) {
        eligible.push(adapter);
        continue;
      }
      const missing = this.missingEnvForSkipped(adapter);
      if (KEYED_SOURCE_IDS.has(adapter.id)) allMissingEnv.push(...missing);
      skipped.push({
        id: adapter.id,
        reason: missing.length > 0 ? `Missing: ${missing.join(", ")}` : "not configured",
      });
    }

    if (eligible.length === 0) {
      const uniqueMissing = [...new Set(allMissingEnv)];
      logger.error("no eligible research sources", { missing: uniqueMissing });
      throw new MissingKeysError(uniqueMissing);
    }

    const sourcesUsed: string[] = [];
    const sourcesFailed: Array<{ id: string; error: string; reason: SourceFailureReason }> = [];
    const sourcesPartial: Array<{ id: string; reason: SourceFailureReason; detail: string }> = [];
    const allItems: RawResearchItem[] = [];

    let completedCount = 0;
    const total = eligible.length;

    const settlements = await Promise.allSettled(
      eligible.map(async (adapter) => {
        onProgress({ type: "source.start", sourceId: adapter.id });
        const result = await adapter.fetch(windowDays, topic);
        completedCount += 1;
        const percent = Math.round((completedCount / total) * 100);

        if (result.ok) {
          sourcesUsed.push(adapter.id);
          allItems.push(...result.items);
          if (result.partialFailure) {
            sourcesPartial.push({
              id: adapter.id,
              reason: result.partialFailure.reason,
              detail: result.partialFailure.detail,
            });
          }
          onProgress({
            type: "source.done",
            sourceId: adapter.id,
            itemCount: result.items.length,
            ...(result.partialFailure ? { partialFailure: result.partialFailure } : {}),
          });
        } else {
          sourcesFailed.push({ id: adapter.id, error: result.error, reason: result.reason });
          onProgress({ type: "source.failed", sourceId: adapter.id, error: result.error, reason: result.reason });
        }

        onProgress({ type: "progress", percent, message: `${completedCount}/${total} sources complete` });
        return result;
      }),
    );

    // Adapters must never throw, but guard against a rogue rejection anyway.
    for (let i = 0; i < settlements.length; i += 1) {
      const settlement = settlements[i];
      const adapter = eligible[i];
      if (settlement && settlement.status === "rejected" && adapter) {
        const message = settlement.reason instanceof Error ? settlement.reason.message : String(settlement.reason);
        const reason = classifyException(settlement.reason);
        sourcesFailed.push({ id: adapter.id, error: message, reason });
        onProgress({ type: "source.failed", sourceId: adapter.id, error: message, reason });
      }
    }

    const dedupedItems = dedupeItems(allItems);
    const opportunities = aggregateOpportunities(dedupedItems);

    const insights: Insight<unknown>[] = opportunities.slice(0, 5).map((opportunity) =>
      makeInsight({
        topic: opportunity.title,
        finding: { keywords: opportunity.keywords, itemCount: opportunity.supportingItems.length },
        reportedBy: "research-engine",
        sources: itemsToSources(opportunity.supportingItems),
        evidence: [
          {
            claim: opportunity.summary,
            supportingSources: itemsToSources(opportunity.supportingItems),
            strength: opportunity.sourceIds.length > 1 ? "medium" : "low",
          },
        ],
        confidence: opportunity.sourceIds.length > 1 ? "medium" : "low",
        unknowns: ["Demand size not independently verified.", "No user interviews conducted."],
      }),
    );

    const report = buildFounderReport(opportunities, insights, {
      sourcesUsed,
      sourcesFailed: sourcesFailed.map((f) => f.id),
      sourcesSkipped: skipped.map((s) => s.id),
      sourcesEligibleCount: eligible.length,
      failedReasons: sourcesFailed.map((f) => ({ id: f.id, reason: f.reason })),
      sourcesPartial,
    });

    const completedAt = nowIso();

    const session: ResearchSession = {
      id: sessionId,
      windowDays,
      ...(topic ? { topic } : {}),
      startedAt,
      completedAt,
      sourcesUsed,
      sourcesFailed,
      sourcesSkipped: skipped,
      sourcesPartial,
      opportunities,
      report,
      totalItemsCollected: dedupedItems.length,
      durationMs: Date.parse(completedAt) - Date.parse(startedAt),
    };

    const artifact = await this.artifacts.register({
      name: `Research session ${sessionId}`,
      kind: "report",
      owner: "research-engine",
      content: JSON.stringify(session, null, 2),
      metadata: { sessionId, windowDays, ...(topic ? { topic } : {}), tags: ["research"] },
    });
    session.artifactId = artifact.id;

    await this.memory.remember("project", sessionId, session, { tags: ["research", sessionId] });

    void this.bus?.publish({
      name: "research.session.completed",
      source: "research-engine",
      payload: { sessionId, artifactId: artifact.id },
    });

    onProgress({ type: "complete", session });

    return session;
  }
}
