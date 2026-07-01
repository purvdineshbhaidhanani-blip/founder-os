import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getConnectorStatus, logout } from "../api/client";
import type { ConnectorStatusView } from "../api/types";
import { useAuth } from "../router";

export default function Settings(): React.ReactElement {
  const [connectors, setConnectors] = useState<ConnectorStatusView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, refresh } = useAuth();

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

  const handleLogout = async (): Promise<void> => {
    await logout();
    await refresh();
    navigate("/login");
  };

  return (
    <div className="page">
      <h1>Settings</h1>

      <section className="card">
        <h2>Account</h2>
        <p>Signed in as {user?.email}</p>
        <button type="button" onClick={() => void handleLogout()}>
          Log out
        </button>
      </section>

      <section className="card">
        <h2>Connector Status</h2>
        {loading && <p className="muted">Loading connector status...</p>}
        {error && <div className="banner banner-error">{error}</div>}
        {!loading && !error && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Connector</th>
                <th>Status</th>
                <th>Required</th>
                <th>Missing Env Vars</th>
              </tr>
            </thead>
            <tbody>
              {connectors.map((connector) => (
                <tr key={connector.id}>
                  <td>{connector.name}</td>
                  <td className={connector.status === "configured" ? "status-ok" : "status-bad"}>
                    {connector.status}
                  </td>
                  <td>{connector.required ? "Yes" : "No"}</td>
                  <td>
                    {connector.missingEnv.length > 0
                      ? connector.missingEnv.map((key) => <code key={key}>{key}</code>)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
