import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSessions } from "../api/client";
import type { ResearchSessionSummary } from "../api/types";

export default function History(): React.ReactElement {
  const [sessions, setSessions] = useState<ResearchSessionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSessions()
      .then((list) => {
        if (!cancelled) setSessions(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load research sessions.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="page-loading">Loading history...</div>;
  if (error) return <div className="banner banner-error">{error}</div>;

  return (
    <div className="page">
      <h1>Research History</h1>

      {sessions.length === 0 ? (
        <p className="muted">No research sessions have completed yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Session ID</th>
              <th>Started</th>
              <th>Window (days)</th>
            </tr>
          </thead>
          <tbody>
            {sessions
              .slice()
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((session) => (
                <tr key={session.sessionId}>
                  <td>
                    <Link to={`/research/report/${encodeURIComponent(session.sessionId)}`}>
                      {session.sessionId}
                    </Link>
                  </td>
                  <td>{new Date(session.createdAt).toLocaleString()}</td>
                  <td>{session.windowDays ?? "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
