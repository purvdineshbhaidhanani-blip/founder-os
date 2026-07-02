import type { Timestamp } from "../types/common.js";
import type { Insight, Source } from "../intelligence/types.js";

/**
 * Research engine surface. A ResearchSession fans out to every eligible
 * SourceAdapter, aggregates the raw items into Opportunity candidates, and
 * wraps the result in a founder-facing report backed by Reality Guard
 * confidence scoring.
 */

/** A single item pulled from a source, before aggregation. */
export interface RawResearchItem {
  title: string;
  url: string;
  snippet?: string;
  publishedAt?: Timestamp;
  sourceId: string;
  author?: string;
  body?: string;
  engagement?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Machine-readable classification of why a source adapter (or one endpoint
 * within a multi-endpoint adapter, e.g. reddit's per-subreddit fetches or
 * rss's per-feed fetches) failed to return usable data.
 *
 * `"no-results"` is reserved for a genuine zero-results outcome that a
 * caller wants to distinguish from an error — a 2xx response with an empty
 * body/array is `{ ok: true, items: [] }`, never a failure, so this reason
 * currently has no active producer in this codebase but is part of the
 * classification contract for future/other adapters that may need it.
 */
export type SourceFailureReason =
  | "no-results"
  | "network-failure"
  | "authentication-failure"
  | "api-limit"
  | "parsing-failure"
  | "unknown-error";

export interface SourceAdapterSuccess {
  ok: true;
  items: RawResearchItem[];
  /**
   * Set when this adapter fans out to multiple endpoints (e.g. reddit hits
   * two subreddits, rss polls three feeds) and at least one endpoint
   * succeeded (so `items` may be non-empty and this is still `ok: true`)
   * while at least one other endpoint failed. Lets callers surface an
   * honest "partial success" signal instead of silently discarding the
   * failed endpoint's absence.
   */
  partialFailure?: { reason: SourceFailureReason; detail: string };
}

export interface SourceAdapterFailure {
  ok: false;
  error: string;
  reason: SourceFailureReason;
}

export type SourceAdapterResult = SourceAdapterSuccess | SourceAdapterFailure;

/**
 * Every source adapter must never throw: all failure modes (network error,
 * timeout, non-2xx response, parse failure) resolve to `{ ok: false }`.
 */
export interface SourceAdapter {
  id: string;
  /** True when the adapter needs no API key/connector credential to run. */
  keyless: boolean;
  /**
   * `topic`, when provided, narrows the adapter's query to that topic
   * (exact behavior is adapter-specific — see each adapter's module
   * comment). When omitted, adapters fall back to their existing
   * fixed/default query or listing.
   */
  fetch(windowDays: number, topic?: string): Promise<SourceAdapterResult>;
}

/** An aggregated opportunity candidate derived from one or more raw items. */
export interface Opportunity {
  id: string;
  title: string;
  summary: string;
  keywords: string[];
  supportingItems: RawResearchItem[];
  sourceIds: string[];
}

export interface FounderReport {
  topOpportunities: Opportunity[];
  evidence: Insight<unknown>[];
  confidenceScore: {
    band: "low" | "medium" | "high";
    numericScore: number;
  };
  sourceCoverage: {
    used: string[];
    failed: string[];
    skipped: string[];
    ratio: number;
    /**
     * Reason classification per fully-failed source, keyed by the same ids
     * that appear in `failed`. Optional/additive so existing consumers that
     * only read `failed`/`used`/`skipped`/`ratio` (e.g. the Report page)
     * keep working unchanged.
     */
    failedReasons?: Array<{ id: string; reason: SourceFailureReason }>;
    /**
     * Sources that returned `ok: true` (and so are already counted in
     * `used`) but reported a `partialFailure` — i.e. some, but not all, of
     * their sub-fetches failed. Surfaced separately from `failed` because
     * these sources DID contribute real items.
     */
    partial?: Array<{ id: string; reason: SourceFailureReason; detail: string }>;
  };
  generatedAt: Timestamp;
}

export interface ResearchSession {
  id: string;
  windowDays: number;
  /** Optional topic narrowing this run's queries — see `SourceAdapter.fetch`'s `topic` param. */
  topic?: string;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  sourcesUsed: string[];
  sourcesFailed: Array<{ id: string; error: string; reason: SourceFailureReason }>;
  sourcesSkipped: Array<{ id: string; reason: string }>;
  /**
   * Sources that succeeded overall (also present in `sourcesUsed`) but
   * flagged a `partialFailure` — see `SourceAdapterSuccess.partialFailure`.
   * Optional/additive (always populated by `ResearchEngine.run`, defaulting
   * to `[]`) so hand-built `ResearchSession` fixtures elsewhere in the
   * codebase that predate this field keep compiling unchanged.
   */
  sourcesPartial?: Array<{ id: string; reason: SourceFailureReason; detail: string }>;
  opportunities: Opportunity[];
  report: FounderReport;
  artifactId?: string;
  totalItemsCollected: number;
  durationMs: number;
}

export type ResearchProgressEvent =
  | { type: "source.start"; sourceId: string }
  | {
      type: "source.done";
      sourceId: string;
      itemCount: number;
      partialFailure?: { reason: SourceFailureReason; detail: string };
    }
  | { type: "source.failed"; sourceId: string; error: string; reason?: SourceFailureReason }
  | { type: "progress"; percent: number; message: string }
  | { type: "complete"; session: ResearchSession };

/** Referenced for downstream typing convenience — re-exported for callers. */
export type { Insight, Source };
