import React, { useEffect, useState } from "react";
import { getDashboard } from "../api/client";
import type { FounderDashboardView } from "../api/types";
import RunResearchButton from "../components/RunResearchButton";
import { errorMessage } from "../lib/errors";

export default function Dashboard(): React.ReactElement {
  const [data, setData] = useState<FounderDashboardView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDashboard()
      .then((view) => {
        if (!cancelled) setData(view);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "Failed to load dashboard."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div className="page-loading">Loading dashboard...</div>;
  if (error) return <div className="banner banner-error">{error}</div>;
  if (!data) return <div className="banner banner-error">No dashboard data available.</div>;

  return (
    <div className="page">
      <h1>Founder Dashboard</h1>
      <p className="page-subtitle">As of {new Date(data.takenAt).toLocaleString()}</p>

      <section className="card">
        <h2>System Health</h2>
        <p className={data.health.ok ? "status-ok" : "status-bad"}>
          {data.health.ok ? "All systems operational" : "Issues detected"}
        </p>
        {data.health.failing.length > 0 && (
          <ul>
            {data.health.failing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Run Research</h2>
        <p>Kick off a fresh research pass over the last 30 days.</p>
        <RunResearchButton windowDays={30} label="Research Last 30 Days" />
      </section>

      <section className="card">
        <h2>Cost Summary</h2>
        <p>
          {(data.costSummary.totalCents / 100).toFixed(2)} USD total &middot; {data.costSummary.totalTokens} tokens
        </p>
        {data.costRecommendations.length > 0 && (
          <ul>
            {data.costRecommendations.map((rec) => (
              <li key={`${rec.kind}-${rec.target}`}>
                <strong>{rec.kind}</strong> on {rec.target} — {rec.rationale}
                {rec.estimatedSavingsCents !== undefined && (
                  <> (save ~${(rec.estimatedSavingsCents / 100).toFixed(2)})</>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Pending Approvals ({data.pendingApprovals.length})</h2>
        {data.pendingApprovals.length === 0 ? (
          <p className="muted">Nothing awaiting approval.</p>
        ) : (
          <ul>
            {data.pendingApprovals.map((approval) => (
              <li key={approval.id}>
                {approval.reason} — requested by {approval.requestedBy}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Notifications</h2>
        {data.notifications.length === 0 ? (
          <p className="muted">No notifications.</p>
        ) : (
          <ul>
            {data.notifications.map((note) => (
              <li key={note.id} className={`notification-${note.level}`}>
                <strong>{note.title}</strong> — {note.body}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Upcoming Events</h2>
        {data.upcomingEvents.length === 0 ? (
          <p className="muted">Nothing scheduled.</p>
        ) : (
          <ul>
            {data.upcomingEvents.map((event) => (
              <li key={event.id}>
                {event.title} — {new Date(event.startsAt).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
