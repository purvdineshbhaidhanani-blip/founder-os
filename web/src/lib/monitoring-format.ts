import type { ChangeEvent, MonitorProviderRunResult, MonitorRunResult, SourceFailureReason } from "../api/types";

/**
 * Pure, DOM-free formatting/aggregation helpers for the Monitoring UI. Kept
 * separate from the React components so they can be unit-tested in the
 * existing node test harness. No business logic — only presentation shaping
 * over data the monitoring API already returns.
 */

export interface RunSummary {
  totalChanges: number;
  added: number;
  removed: number;
  changed: number;
  providersOk: number;
  providersFailed: number;
  firstRunProviders: number;
}

/** Counts change types + provider outcomes across a whole run. */
export function summarizeRun(run: MonitorRunResult): RunSummary {
  let added = 0;
  let removed = 0;
  let changed = 0;
  let firstRunProviders = 0;
  for (const result of run.results) {
    if (result.firstRun) firstRunProviders += 1;
    for (const change of result.changes) {
      if (change.type === "added") added += 1;
      else if (change.type === "removed") removed += 1;
      else changed += 1;
    }
  }
  return {
    totalChanges: run.totalChanges,
    added,
    removed,
    changed,
    providersOk: run.providersRun.length,
    providersFailed: run.providersFailed.length,
    firstRunProviders,
  };
}

/** Human-readable one-line description of a single change event. */
export function formatChange(change: ChangeEvent): string {
  if (change.type === "added") return `New: ${change.title}`;
  if (change.type === "removed") return `Removed: ${change.title}`;
  const field = change.field ?? "field";
  return `${change.title}: ${field} ${String(change.previousValue ?? "?")} → ${String(change.currentValue ?? "?")}`;
}

/** The "newly detected" items in a run — every `added` change across providers. */
export function newlyDetected(run: MonitorRunResult): ChangeEvent[] {
  return run.results.flatMap((result) => result.changes.filter((change) => change.type === "added"));
}

const FAILURE_REASON_LABELS: Record<SourceFailureReason, string> = {
  "no-results": "No results",
  "network-failure": "Network failure",
  "authentication-failure": "Authentication failure (missing/invalid credentials)",
  "api-limit": "API rate limit reached",
  "parsing-failure": "Response parsing failure",
  "unknown-error": "Unknown error",
};

export function failureReasonLabel(reason: SourceFailureReason | undefined): string {
  if (!reason) return "Unknown error";
  return FAILURE_REASON_LABELS[reason] ?? reason;
}

/** Short status word for a provider result, for badges. */
export function providerStatus(result: MonitorProviderRunResult): "ok" | "first-run" | "failed" {
  if (!result.ok) return "failed";
  if (result.firstRun) return "first-run";
  return "ok";
}
