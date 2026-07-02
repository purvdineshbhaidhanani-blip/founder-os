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

export interface SourceAdapterSuccess {
  ok: true;
  items: RawResearchItem[];
}

export interface SourceAdapterFailure {
  ok: false;
  error: string;
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
  fetch(windowDays: number): Promise<SourceAdapterResult>;
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
  };
  generatedAt: Timestamp;
}

export interface ResearchSession {
  id: string;
  windowDays: number;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  sourcesUsed: string[];
  sourcesFailed: Array<{ id: string; error: string }>;
  sourcesSkipped: Array<{ id: string; reason: string }>;
  opportunities: Opportunity[];
  report: FounderReport;
  artifactId?: string;
  totalItemsCollected: number;
  durationMs: number;
}

export type ResearchProgressEvent =
  | { type: "source.start"; sourceId: string }
  | { type: "source.done"; sourceId: string; itemCount: number }
  | { type: "source.failed"; sourceId: string; error: string }
  | { type: "progress"; percent: number; message: string }
  | { type: "complete"; session: ResearchSession };

/** Referenced for downstream typing convenience — re-exported for callers. */
export type { Insight, Source };
