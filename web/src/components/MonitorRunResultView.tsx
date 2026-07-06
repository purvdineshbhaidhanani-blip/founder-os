import React from "react";
import type { MonitorRunResult } from "../api/types";
import {
  failureReasonLabel,
  formatChange,
  newlyDetected,
  providerStatus,
  summarizeRun,
} from "../lib/monitoring-format";

function statusBadgeClass(status: "ok" | "first-run" | "failed"): string {
  if (status === "failed") return "badge badge-warn";
  if (status === "first-run") return "badge badge-detail";
  return "badge badge-ok";
}

/**
 * Renders one MonitorRunResult: an aggregate summary, the "newly detected"
 * highlight (every `added` change), and a per-provider breakdown with status,
 * first-run vs incremental, changes, and failure reasons. Display only —
 * consumes exactly what the monitoring API returned.
 */
export default function MonitorRunResultView({ run }: { run: MonitorRunResult }): React.ReactElement {
  const summary = summarizeRun(run);
  const newItems = newlyDetected(run);

  return (
    <div className="monitor-run">
      <div className="monitor-run-summary badge-grid">
        <span className="badge">Query: {run.query}</span>
        <span className="badge">Changes: {summary.totalChanges}</span>
        <span className="badge badge-ok">+{summary.added} new</span>
        <span className="badge">~{summary.changed} changed</span>
        <span className="badge">-{summary.removed} removed</span>
        <span className="badge">{summary.providersOk} ok</span>
        {summary.providersFailed > 0 && <span className="badge badge-warn">{summary.providersFailed} failed</span>}
        {summary.firstRunProviders > 0 && (
          <span className="badge badge-detail">{summary.firstRunProviders} first-run (baseline)</span>
        )}
      </div>

      {newItems.length > 0 && (
        <div className="monitor-new">
          <h4>Newly detected ({newItems.length})</h4>
          <ul>
            {newItems.map((change) => (
              <li key={`${change.sourceId}-${change.itemId}`}>
                <a href={change.url} target="_blank" rel="noreferrer">
                  {change.title}
                </a>{" "}
                <span className="muted">via {change.sourceId}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="monitor-providers">
        {run.results.map((result) => {
          const status = providerStatus(result);
          return (
            <div key={result.providerId} className="monitor-provider-result">
              <div className="monitor-provider-head">
                <strong>{result.providerId}</strong>
                <span className="muted"> ({result.category})</span>
                <span className={statusBadgeClass(status)}>{status}</span>
              </div>

              {result.ok ? (
                <>
                  <p className="muted">
                    {result.itemCount} item(s) observed
                    {result.firstRun
                      ? " — first run, baseline stored (no changes to report yet)."
                      : ` — ${result.changes.length} change(s) since last snapshot.`}
                  </p>
                  {result.changes.length > 0 && (
                    <ul className="monitor-changes">
                      {result.changes.map((change, index) => (
                        <li key={`${change.itemId}-${index}`} className={`monitor-change monitor-change-${change.type}`}>
                          {formatChange(change)}
                        </li>
                      ))}
                    </ul>
                  )}
                  {result.partialFailure && (
                    <p className="muted">
                      Partial: {failureReasonLabel(result.partialFailure.reason)} — {result.partialFailure.detail}
                    </p>
                  )}
                </>
              ) : (
                <p className="status-bad">
                  Failed: {failureReasonLabel(result.reason)}
                  {result.error ? ` — ${result.error}` : ""}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
