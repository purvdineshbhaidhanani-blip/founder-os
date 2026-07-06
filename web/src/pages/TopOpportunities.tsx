import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPipelineExportUrl, getPipelineOpportunities } from "../api/client";
import type { TopOpportunitiesReport } from "../api/types";
import ConfidenceBadge from "../components/ConfidenceBadge";

function verdictClass(verdict: string): string {
  if (verdict === "BUILD") return "badge-verdict-build";
  if (verdict === "WAIT") return "badge-verdict-wait";
  return "badge-verdict-ignore";
}

export default function TopOpportunities(): React.ReactElement {
  const { pipelineId } = useParams<{ pipelineId: string }>();
  const [report, setReport] = useState<TopOpportunitiesReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pipelineId) return;
    let cancelled = false;
    setLoading(true);
    getPipelineOpportunities(pipelineId)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load top opportunities.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pipelineId]);

  if (loading) return <div className="page-loading">Loading top opportunities...</div>;
  if (error) return <div className="banner banner-error">{error}</div>;
  if (!report) return <div className="banner banner-error">No opportunities report available.</div>;

  return (
    <div className="page">
      <h1>Top Opportunities</h1>
      <p className="page-subtitle">Generated {new Date(report.generatedAt).toLocaleString()}</p>
      <p className="page-subtitle">
        {report.opportunities.length} shown of {report.totalClustersConsidered} cluster(s) considered.
      </p>

      <section className="card">
        <h2>Export</h2>
        <div className="export-actions">
          <a href={getPipelineExportUrl(pipelineId!, "markdown")}>
            <button type="button">Export Markdown</button>
          </a>
          <a href={getPipelineExportUrl(pipelineId!, "json")}>
            <button type="button">Export JSON</button>
          </a>
        </div>
      </section>

      {report.opportunities.length === 0 ? (
        <div className="card">
          <p className="muted">No opportunities surfaced for this run.</p>
        </div>
      ) : (
        <div className="opportunity-rank-list">
          {report.opportunities.map((opportunity, index) => (
            <Link
              key={opportunity.id}
              to={`/pipeline/${encodeURIComponent(pipelineId!)}/opportunities/${encodeURIComponent(opportunity.id)}`}
              className="opportunity-rank-row card"
            >
              <div className="opportunity-rank-number">#{index + 1}</div>
              <div className="opportunity-rank-body">
                <h3>{opportunity.problem}</h3>
                <p className="muted">{opportunity.summary}</p>
                <div className="opportunity-rank-meta">
                  <span className={`badge ${verdictClass(opportunity.recommendation.verdict)}`}>
                    {opportunity.recommendation.verdict}
                  </span>
                  <span className="badge">FOIS: {opportunity.fois.overall.toFixed(1)}</span>
                  <span className="badge">Pain: {opportunity.painScore.toFixed(2)}</span>
                  <ConfidenceBadge score={{ band: opportunity.confidence.band as "low" | "medium" | "high", numericScore: opportunity.confidence.score }} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
