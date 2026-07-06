import type { Timestamp } from "../types/common.js";
import type { SourceFailureReason } from "../research/types.js";

/**
 * Phase 7 (Autonomous Monitoring) surface. A `MonitorProvider` answers "what
 * does the world look like right now for this query" (a `MonitorSnapshot`);
 * the pure diff engine (`diff.ts`) then answers "what changed since last
 * time" by comparing two snapshots. There is no database here — snapshots
 * are plain in-memory data structures that a caller is responsible for
 * persisting/loading between checks.
 *
 * Deliberately mirrors `src/research/types.ts`'s `SourceAdapter` contract
 * (same never-throws discipline, same `SourceFailureReason` union, reused
 * verbatim from the research engine via `classifyHttpStatus`/
 * `classifyException` in `src/research/sources/classify.ts`) so the two
 * pipelines stay conceptually and structurally consistent.
 */

/** The eight monitoring domains this module targets. Informational/routing
 * metadata on a provider — providers are free to surface items relevant to
 * more than one category (e.g. an HN "Show HN" post is both a
 * `product-hunt`-style launch and a `competitor-launch`); `category` names
 * the provider's *primary* focus, it does not gate what a provider returns.
 */
export type MonitorCategory =
  | "competitor-launch"
  | "pricing"
  | "feature-release"
  | "funding"
  | "product-hunt"
  | "trending-github"
  | "complaint"
  | "market";

/**
 * A single tracked entity's state as observed at `capturedAt`. `id` MUST be
 * a stable identity (a URL, permalink, or repo full_name are all fine) so
 * that the diff engine can recognize "the same item, possibly changed"
 * across two snapshots taken at different times.
 *
 * `fields` holds whatever comparable, JSON-primitive facts the provider was
 * able to observe (price, star count, points, status, etc). Only primitive
 * values are allowed deliberately — the diff engine does a shallow,
 * strict-equality field compare and intentionally does not attempt deep
 * object diffing.
 */
export interface MonitorSnapshotItem {
  id: string;
  title: string;
  url: string;
  fields?: Record<string, string | number | boolean | undefined>;
  capturedAt: Timestamp;
  sourceId: string;
  metadata?: Record<string, unknown>;
}

/** The full observed state for one provider/query pair at one point in time. */
export interface MonitorSnapshot {
  providerId: string;
  category: MonitorCategory;
  query: string;
  capturedAt: Timestamp;
  items: MonitorSnapshotItem[];
}

export interface MonitorProviderSuccess {
  ok: true;
  snapshot: MonitorSnapshot;
  /**
   * Set when this provider fans out to multiple endpoints (mirrors
   * `SourceAdapterSuccess.partialFailure` in the research engine) and at
   * least one, but not all, endpoints failed.
   */
  partialFailure?: { reason: SourceFailureReason; detail: string };
}

export interface MonitorProviderFailure {
  ok: false;
  error: string;
  reason: SourceFailureReason;
}

export type MonitorProviderResult = MonitorProviderSuccess | MonitorProviderFailure;

/**
 * Every monitor provider must never throw: all failure modes (network
 * error, timeout, non-2xx response, parse failure) resolve to
 * `{ ok: false }`, exactly like `SourceAdapter.fetch` in the research
 * engine.
 */
export interface MonitorProvider {
  id: string;
  /** True when the provider needs no API key/connector credential to run. */
  keyless: boolean;
  /** The provider's primary monitoring domain — see `MonitorCategory`. */
  category: MonitorCategory;
  /**
   * `query` scopes what's monitored (a competitor name, product keyword, or
   * for `webSnapshotProvider` a target URL — see that provider's module
   * comment). `windowDays`, when the underlying endpoint supports recency
   * filtering, narrows results to that recency window; providers that have
   * no notion of a time window (e.g. a single-page snapshot) ignore it.
   */
  fetch(query: string, windowDays?: number): Promise<MonitorProviderResult>;
}

/* ---------------------------------------------------------------------- */
/* Monitoring run orchestration (engine.ts) — the server-facing surface.  */
/* ---------------------------------------------------------------------- */

/** Input to `MonitorEngine.run` — scopes which providers run and for what query. */
export interface MonitorRunInput {
  /** What to monitor: a competitor name / product keyword, or a target URL for the web-snapshot provider. */
  query: string;
  /** Recency window in days for providers that support it; ignored by providers that don't. */
  windowDays?: number;
  /** Restrict the run to these provider ids; when omitted, all (category-filtered, else every) providers run. */
  providerIds?: string[];
  /** Restrict the run to providers whose primary `category` matches; ignored when `providerIds` is given. */
  category?: MonitorCategory;
}

/** Provider descriptor returned by `MonitorEngine.listProviders` (no fetch, safe to serialize). */
export interface MonitorProviderInfo {
  id: string;
  category: MonitorCategory;
  keyless: boolean;
}

/** Per-provider outcome of a single monitoring run. */
export interface MonitorProviderRunResult {
  providerId: string;
  category: MonitorCategory;
  ok: boolean;
  /** True when no previous snapshot existed for this provider/query — changes are intentionally empty (nothing to diff against). */
  firstRun: boolean;
  itemCount: number;
  changes: ChangeEvent[];
  /** Present only when this provider fanned out and some (not all) endpoints failed. */
  partialFailure?: { reason: SourceFailureReason; detail: string };
  /** Present only when `ok === false`. */
  error?: string;
  reason?: SourceFailureReason;
}

/** Full, typed result of one `MonitorEngine.run` invocation. */
export interface MonitorRunResult {
  runId: string;
  query: string;
  windowDays: number;
  startedAt: Timestamp;
  completedAt: Timestamp;
  durationMs: number;
  providersRun: string[];
  providersFailed: string[];
  totalChanges: number;
  results: MonitorProviderRunResult[];
  artifactId?: string;
}

export type ChangeEventType = "added" | "removed" | "changed";

/**
 * One unit of "what changed since last check", produced by `diffSnapshots`.
 *   - `"added"`: `itemId` is present in `current` but not `previous`.
 *   - `"removed"`: `itemId` is present in `previous` but not `current`.
 *   - `"changed"`: `itemId` is present in both, but the value of `field`
 *     differs; `previousValue`/`currentValue` carry the before/after values.
 */
export interface ChangeEvent {
  type: ChangeEventType;
  itemId: string;
  title: string;
  url: string;
  sourceId: string;
  /** Populated only for `type: "changed"` — the name of the field that changed. */
  field?: string;
  previousValue?: string | number | boolean;
  currentValue?: string | number | boolean;
}
