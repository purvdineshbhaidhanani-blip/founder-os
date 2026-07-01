import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getReport } from "../api/client";
import type { FounderReport } from "../api/types";
import ConfidenceBadge from "../components/ConfidenceBadge";

export default function Report(): React.ReactElement {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [report, setReport] = useState<FounderReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    setLoading(true);
    getReport(sessionId)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load report.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) return <div className="page-loading">Loading report...</div>;
  if (error) return <div className="banner banner-error">{error}</div>;
  if (!report) return <div className="banner banner-error">No report available.</div>;

  return (
    <div className="page">
      <h1>Research Report</h1>
      <p className="page-subtitle">Session: {sessionId}</p>
      <p className="page-subtitle">Generated {new Date(report.generatedAt).toLocaleString()}</p>

      <section className="card">
        <ConfidenceBadge score={report.confidenceScore} />
      </section>

      <section className="card">
        <h2>Source Coverage</h2>
        <p>
          Ratio: {(report.sourceCoverage.ratio * 100).toFixed(0)}% &middot; Used:{" "}
          {report.sourceCoverage.used.join(", ") || "none"}
        </p>
        {report.sourceCoverage.failed.length > 0 && (
          <p className="status-bad">Failed: {report.sourceCoverage.failed.join(", ")}</p>
        )}
        {report.sourceCoverage.skipped.length > 0 && (
          <p className="muted">Skipped: {report.sourceCoverage.skipped.join(", ")}</p>
        )}
      </section>

      <section className="card">
        <h2>Top Opportunities ({report.topOpportunities.length})</h2>
        {report.topOpportunities.length === 0 ? (
          <p className="muted">No opportunities surfaced for this run.</p>
        ) : (
          <div className="opportunity-list">
            {report.topOpportunities.map((opp) => (
              <article key={opp.id} className="opportunity-card">
                <h3>{opp.title}</h3>
                <p>{opp.summary}</p>
                {opp.keywords.length > 0 && (
                  <p className="opportunity-keywords">
                    {opp.keywords.map((keyword) => (
                      <span key={keyword} className="badge badge-keyword">
                        {keyword}
                      </span>
                    ))}
                  </p>
                )}
                <p className="muted">Sources: {opp.sourceIds.join(", ")}</p>
                {opp.supportingItems.length > 0 && (
                  <ul>
                    {opp.supportingItems.map((item) => (
                      <li key={item.url}>
                        <a href={item.url} target="_blank" rel="noreferrer">
                          {item.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Evidence ({report.evidence.length})</h2>
        {report.evidence.length === 0 ? (
          <p className="muted">No supplementary evidence recorded.</p>
        ) : (
          <ul>
            {report.evidence.map((insight, index) => (
              <li key={insight.id ?? index}>{insight.summary ?? JSON.stringify(insight)}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
