import React, { useEffect, useState } from "react";
import { getConnectorStatus } from "../api/client";
import type { ConnectorStatusView } from "../api/types";
import SourceStatusBadge from "../components/SourceStatusBadge";
import RunResearchButton from "../components/RunResearchButton";

export default function Research(): React.ReactElement {
  const [connectors, setConnectors] = useState<ConnectorStatusView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [windowDays, setWindowDays] = useState(30);

  useEffect(() => {
    let cancelled = false;
    getConnectorStatus()
      .then((list) => {
        if (!cancelled) setConnectors(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load connector status.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <h1>Research</h1>

      <section className="card">
        <h2>Source Status</h2>
        {loading && <p className="muted">Loading connector status...</p>}
        {error && <div className="banner banner-error">{error}</div>}
        {!loading && !error && (
          <div className="badge-grid">
            {connectors.map((connector) => (
              <SourceStatusBadge key={connector.id} connector={connector} />
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Run a Research Pass</h2>
        <label htmlFor="windowDays">Window (days)</label>
        <input
          id="windowDays"
          type="number"
          min={1}
          max={365}
          value={windowDays}
          onChange={(e) => setWindowDays(Number(e.target.value) || 30)}
        />
        <RunResearchButton windowDays={windowDays} label={`Run Research (${windowDays} days)`} />
      </section>
    </div>
  );
}
