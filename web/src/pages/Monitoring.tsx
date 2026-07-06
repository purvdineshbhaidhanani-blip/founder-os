import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getMonitoringProviders,
  getMonitoringRuns,
  getMonitoringSnapshot,
  runMonitoring,
} from "../api/client";
import type { MonitorCategory, MonitorProviderInfo, MonitorRunResult, MonitorSnapshot } from "../api/types";
import MonitorRunResultView from "../components/MonitorRunResultView";
import { errorMessage } from "../lib/errors";

const CATEGORIES: MonitorCategory[] = [
  "competitor-launch",
  "pricing",
  "feature-release",
  "funding",
  "product-hunt",
  "trending-github",
  "complaint",
  "market",
];

export default function Monitoring(): React.ReactElement {
  const [providers, setProviders] = useState<MonitorProviderInfo[]>([]);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [providersLoading, setProvidersLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MonitorCategory | "">("");
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);

  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<MonitorRunResult | null>(null);

  const [runs, setRuns] = useState<MonitorRunResult[]>([]);
  const [runsError, setRunsError] = useState<string | null>(null);

  const [snapshot, setSnapshot] = useState<MonitorSnapshot | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const loadProviders = useCallback(() => {
    setProvidersLoading(true);
    setProvidersError(null);
    getMonitoringProviders()
      .then((res) => setProviders(res.providers))
      .catch((err) => setProvidersError(errorMessage(err)))
      .finally(() => setProvidersLoading(false));
  }, []);

  const loadRuns = useCallback(() => {
    setRunsError(null);
    getMonitoringRuns(20)
      .then((res) => setRuns(res.runs))
      .catch((err) => setRunsError(errorMessage(err)));
  }, []);

  useEffect(() => {
    loadProviders();
    loadRuns();
  }, [loadProviders, loadRuns]);

  const visibleProviders = useMemo(
    () => (category ? providers.filter((provider) => provider.category === category) : providers),
    [providers, category],
  );

  const toggleProvider = (id: string): void => {
    setSelectedProviders((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const handleRun = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!query.trim()) return;
    setRunning(true);
    setRunError(null);
    try {
      const result = await runMonitoring({
        query: query.trim(),
        ...(selectedProviders.length > 0 ? { providerIds: selectedProviders } : {}),
        ...(category && selectedProviders.length === 0 ? { category } : {}),
      });
      setLastRun(result);
      loadRuns();
    } catch (err) {
      setRunError(errorMessage(err));
    } finally {
      setRunning(false);
    }
  };

  const viewSnapshot = async (providerId: string): Promise<void> => {
    setSnapshot(null);
    setSnapshotError(null);
    if (!query.trim()) {
      setSnapshotError("Enter the same query you monitored to load its last snapshot.");
      return;
    }
    try {
      const result = await getMonitoringSnapshot(providerId, query.trim());
      setSnapshot(result);
    } catch (err) {
      setSnapshotError(errorMessage(err));
    }
  };

  return (
    <div className="page monitoring-page">
      <h1>Monitoring</h1>
      <p className="page-subtitle">
        Detect changes across external sources over time. Each run diffs against the last stored snapshot — the first
        run for a provider/query just records a baseline.
      </p>

      <section className="card">
        <h2>Providers</h2>
        {providersLoading ? (
          <p className="muted">Loading providers…</p>
        ) : providersError ? (
          <div className="banner banner-error">
            {providersError} <button type="button" onClick={loadProviders}>Retry</button>
          </div>
        ) : providers.length === 0 ? (
          <p className="muted">No monitoring providers are configured.</p>
        ) : (
          <div className="monitor-provider-picker">
            {visibleProviders.map((provider) => (
              <label key={provider.id} className="monitor-provider-option">
                <input
                  type="checkbox"
                  checked={selectedProviders.includes(provider.id)}
                  onChange={() => toggleProvider(provider.id)}
                />
                <span>
                  <strong>{provider.id}</strong> <span className="muted">({provider.category})</span>{" "}
                  <span
                    className={provider.keyless ? "badge badge-ok" : "badge badge-warn"}
                    title={
                      provider.keyless
                        ? "No credentials required — ready to run."
                        : "May require API credentials on the server; runs but can fail with an authentication error if unconfigured."
                    }
                  >
                    {provider.keyless ? "Ready" : "Needs credentials"}
                  </span>
                </span>
                <button type="button" className="monitor-snapshot-link" onClick={() => void viewSnapshot(provider.id)}>
                  last snapshot
                </button>
              </label>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Run a check</h2>
        <form className="monitor-run-form" onSubmit={(event) => void handleRun(event)}>
          <input
            type="text"
            className="copilot-input"
            placeholder="What to monitor (competitor name, keyword, or a URL for web-snapshot)…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Monitoring query"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as MonitorCategory | "")}
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <button type="submit" disabled={running || query.trim().length === 0}>
            {running ? "Running…" : "Run monitoring"}
          </button>
        </form>
        <p className="muted">
          {selectedProviders.length > 0
            ? `Will run ${selectedProviders.length} selected provider(s).`
            : category
              ? `Will run all providers in "${category}".`
              : "Will run all providers."}
        </p>
        {runError && <div className="banner banner-error">{runError}</div>}
      </section>

      {running && !lastRun && <div className="page-loading">Running monitoring…</div>}

      {lastRun && (
        <section className="card">
          <h2>Last run</h2>
          <p className="page-subtitle">
            {new Date(lastRun.startedAt).toLocaleString()} · {lastRun.durationMs}ms
          </p>
          <MonitorRunResultView run={lastRun} />
        </section>
      )}

      {snapshotError && (
        <section className="card">
          <h2>Snapshot</h2>
          <div className="banner banner-error">{snapshotError}</div>
        </section>
      )}
      {snapshot && (
        <section className="card">
          <h2>
            Last snapshot — {snapshot.providerId} · {snapshot.query}
          </h2>
          <p className="page-subtitle">
            {new Date(snapshot.capturedAt).toLocaleString()} · {snapshot.items.length} item(s)
          </p>
          <ul className="monitor-snapshot-items">
            {snapshot.items.map((item) => (
              <li key={item.id}>
                <a href={item.url} target="_blank" rel="noreferrer">
                  {item.title}
                </a>
                {item.fields && (
                  <span className="muted">
                    {" "}
                    —{" "}
                    {Object.entries(item.fields)
                      .filter(([, value]) => value !== undefined)
                      .map(([key, value]) => `${key}=${String(value)}`)
                      .join(", ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>Run history</h2>
        {runsError ? (
          <div className="banner banner-error">
            {runsError} <button type="button" onClick={loadRuns}>Retry</button>
          </div>
        ) : runs.length === 0 ? (
          <p className="muted">No monitoring runs yet — run a check above to get started.</p>
        ) : (
          <ul className="monitor-run-history">
            {runs.map((run) => (
              <li key={run.runId}>
                <details>
                  <summary>
                    {new Date(run.startedAt).toLocaleString()} · &quot;{run.query}&quot; · {run.totalChanges} change(s) ·{" "}
                    {run.providersFailed.length > 0 ? `${run.providersFailed.length} failed` : "all ok"}
                  </summary>
                  <MonitorRunResultView run={run} />
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
