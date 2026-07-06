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

      {/*
        Opportunity Selection — the backend's final elimination/survivor-ranking
        layer (read-only rendering; no backend contract changed). Survivors carry
        a High Conviction Score distinct from FOIS.
      */}
      <section className="card">
        <h2>Opportunity Selection</h2>
        <p className="page-subtitle">
          {report.opportunitySelection.survivors.length} survivor(s) &middot;{" "}
          {report.opportunitySelection.rejected.length} eliminated
        </p>
        {report.opportunitySelection.survivors.length === 0 ? (
          <p className="muted">No opportunity survived the elimination gates.</p>
        ) : (
          report.opportunitySelection.survivors.map((survivor) => (
            <div key={survivor.report.id} className="card">
              <h3>{survivor.report.problem}</h3>
              <p>
                <span className="badge">High Conviction: {survivor.highConvictionScore.overall.toFixed(1)}</span>{" "}
                <span className="badge">FOIS: {survivor.report.fois.overall.toFixed(1)}</span>
              </p>
              <p className="muted">{survivor.whySurvived}</p>
              <details>
                <summary>Score dimensions &amp; self-critique</summary>
                <ul>
                  {survivor.highConvictionScore.dimensions.map((dimension) => (
                    <li key={dimension.name}>
                      <strong>{dimension.name}:</strong> {dimension.weighted.toFixed(1)} (raw{" "}
                      {dimension.raw.toFixed(0)} &times; {dimension.weight.toFixed(2)}) — {dimension.reason}
                    </li>
                  ))}
                </ul>
                <h4>Strongest risk</h4>
                <p>
                  {survivor.selfCritique.strongestRisk.risk} ({survivor.selfCritique.strongestRisk.score}) —{" "}
                  {survivor.selfCritique.strongestRisk.reason}
                </p>
                <h4>Strongest unknown</h4>
                <p>{survivor.selfCritique.strongestUnknown}</p>
                {survivor.selfCritique.reasonsToBuild.length > 0 && (
                  <>
                    <h4>Reasons to build</h4>
                    <ul>
                      {survivor.selfCritique.reasonsToBuild.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  </>
                )}
                {survivor.selfCritique.reasonsNotToBuild.length > 0 && (
                  <>
                    <h4>Reasons not to build</h4>
                    <ul>
                      {survivor.selfCritique.reasonsNotToBuild.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  </>
                )}
              </details>
            </div>
          ))
        )}
        {report.opportunitySelection.rejected.length > 0 && (
          <details>
            <summary>{report.opportunitySelection.rejected.length} eliminated opportunity(ies)</summary>
            <ul>
              {report.opportunitySelection.rejected.map((rejected) => (
                <li key={rejected.reportId}>
                  <code>{rejected.reportId}</code> — {rejected.whyRejected.join("; ")}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="card">
        <h2>Run Calibration</h2>
        <p className="page-subtitle">
          Aggregate diagnostics over the whole run (read-only; never affects ranking).
        </p>
        <div className="badge-grid">
          <span className="badge">Items collected: {report.calibration.itemsCollected}</span>
          <span className="badge">Clustered: {report.calibration.itemsClustered}</span>
          <span className="badge">Rejected by gates: {report.calibration.opportunitiesRejectedByGates}</span>
          <span className="badge badge-verdict-build">BUILD {report.calibration.verdictBreakdown.build}</span>
          <span className="badge badge-verdict-wait">WATCH {report.calibration.verdictBreakdown.watch}</span>
          <span className="badge badge-verdict-ignore">IGNORE {report.calibration.verdictBreakdown.ignore}</span>
        </div>
        <ul>
          <li>Average FOIS: {report.calibration.averageFois.toFixed(1)}</li>
          <li>Average evidence: {report.calibration.averageEvidence.toFixed(2)}</li>
          <li>Average source diversity: {report.calibration.averageSourceDiversity.toFixed(2)}</li>
          <li>
            Items removed by relevance:{" "}
            {report.calibration.itemsRemovedByRelevance === null
              ? "unknown (no relevance filter recorded)"
              : report.calibration.itemsRemovedByRelevance}
          </li>
          <li>Likely false positives: {report.calibration.falsePositiveCount}</li>
        </ul>
        <h3>FOIS threshold diagnostic (advisory)</h3>
        <p className="muted">
          BUILD threshold {report.calibration.thresholdDiagnostic.foisBuildThreshold} ·{" "}
          {report.calibration.thresholdDiagnostic.acceptedPct.toFixed(0)}% accepted ·{" "}
          {report.calibration.thresholdDiagnostic.rejectedPct.toFixed(0)}% rejected
        </p>
        <p className="muted">{report.calibration.thresholdDiagnostic.suggestion}</p>
        {report.calibration.notes.length > 0 && (
          <ul>
            {report.calibration.notes.map((note, index) => (
              <li key={index} className="muted">
                {note}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Semantic Merge</h2>
        {report.semanticMerge.aliasGroupsApplied === 0 ? (
          <p className="muted">
            No synonym opportunities were merged this run — category clustering already de-duplicated them upstream.
          </p>
        ) : (
          <>
            <p className="page-subtitle">{report.semanticMerge.aliasGroupsApplied} alias group(s) merged.</p>
            <ul>
              {report.semanticMerge.aliasGroups.map((group, index) => (
                <li key={index}>
                  <strong>{group.canonical}</strong> (matched &ldquo;{group.matchedAlias}&rdquo;) —{" "}
                  {group.memberProblems.join("; ")}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
