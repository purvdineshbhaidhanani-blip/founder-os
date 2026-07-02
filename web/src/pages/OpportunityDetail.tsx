import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getOpportunityDetail } from "../api/client";
import type { FounderOpportunityReport } from "../api/types";
import ConfidenceBadge from "../components/ConfidenceBadge";

function verdictClass(verdict: string): string {
  if (verdict === "BUILD") return "badge-verdict-build";
  if (verdict === "WAIT") return "badge-verdict-wait";
  return "badge-verdict-ignore";
}

export default function OpportunityDetail(): React.ReactElement {
  const { pipelineId, opportunityId } = useParams<{ pipelineId: string; opportunityId: string }>();
  const [opportunity, setOpportunity] = useState<FounderOpportunityReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pipelineId || !opportunityId) return;
    let cancelled = false;
    setLoading(true);
    getOpportunityDetail(pipelineId, opportunityId)
      .then((data) => {
        if (!cancelled) setOpportunity(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load opportunity.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pipelineId, opportunityId]);

  if (loading) return <div className="page-loading">Loading opportunity...</div>;
  if (error) return <div className="banner banner-error">{error}</div>;
  if (!opportunity) return <div className="banner banner-error">Opportunity not found.</div>;

  const { scoreBreakdown, buyingIntent, competition, buildDifficulty, recommendation, supportingEvidence } = opportunity;

  return (
    <div className="page">
      <h1>{opportunity.problem}</h1>
      <p className="page-subtitle">Category: {opportunity.category}</p>
      <p>{opportunity.summary}</p>

      <section className="card">
        <h2>Recommendation</h2>
        <span className={`badge ${verdictClass(recommendation.verdict)}`}>{recommendation.verdict}</span>
        <p>{recommendation.explanation}</p>
        {recommendation.whyBuild.length > 0 && (
          <>
            <h3>Why build</h3>
            <ul>
              {recommendation.whyBuild.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          </>
        )}
        {recommendation.whyNotBuild.length > 0 && (
          <>
            <h3>Why not build</h3>
            <ul>
              {recommendation.whyNotBuild.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          </>
        )}
        {recommendation.risk.length > 0 && (
          <>
            <h3>Risk</h3>
            <ul>
              {recommendation.risk.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card">
        <h2>Score Breakdown</h2>
        <p>
          <strong>Weighted total:</strong> {scoreBreakdown.weightedTotal.toFixed(3)} &middot;{" "}
          <strong>Pain score:</strong> {opportunity.painScore.toFixed(2)} &middot;{" "}
          <ConfidenceBadge score={{ band: opportunity.confidence.band as "low" | "medium" | "high", numericScore: opportunity.confidence.score }} />
        </p>
        <ul>
          <li>Pain / frequency: {scoreBreakdown.painFrequency.toFixed(3)}</li>
          <li>Source diversity: {scoreBreakdown.sourceDiversity.toFixed(3)}</li>
          <li>Author diversity: {scoreBreakdown.authorDiversity.toFixed(3)}</li>
          <li>Buying intent: {scoreBreakdown.buyingIntent.toFixed(3)}</li>
          <li>Engagement: {scoreBreakdown.engagement.toFixed(3)}</li>
          <li>Growth: {scoreBreakdown.growth.toFixed(3)}</li>
          <li>Competition: {scoreBreakdown.competition.toFixed(3)}</li>
          <li>Confidence: {scoreBreakdown.confidence.toFixed(3)}</li>
        </ul>
        <p className="muted">{scoreBreakdown.explanation}</p>
      </section>

      <section className="card">
        <h2>Buying Intent</h2>
        <p>
          Score: {buyingIntent.score.toFixed(2)} ({buyingIntent.matchingItemCount}/{buyingIntent.totalItemCount} items)
        </p>
        <p className="muted">{buyingIntent.explanation}</p>
      </section>

      <section className="card">
        <h2>Competition</h2>
        <p>Competition score: {competition.competitionScore.toFixed(2)}</p>
        <p className="muted">{competition.explanation}</p>
        {competition.competitors.length > 0 ? (
          <ul>
            {competition.competitors.map((competitor) => (
              <li key={competitor.name}>
                <strong>{competitor.name}</strong> — mentioned {competitor.mentionCount} time(s)
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No named competitors detected in the evidence.</p>
        )}
      </section>

      <section className="card">
        <h2>Supporting Evidence ({supportingEvidence.evidenceCount})</h2>
        <p className="muted">
          Sources:{" "}
          {Object.entries(supportingEvidence.sourceBreakdown)
            .map(([source, count]) => `${source}=${count}`)
            .join(", ") || "none"}
        </p>
        <details>
          <summary>{supportingEvidence.urls.length} source URL(s)</summary>
          <ul>
            {supportingEvidence.urls.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer">
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section className="card">
        <h2>Representative Quotes</h2>
        {opportunity.representativeQuotes.length === 0 ? (
          <p className="muted">No representative quotes available.</p>
        ) : (
          <ul>
            {opportunity.representativeQuotes.map((quote, index) => (
              <li key={index}>
                &ldquo;{quote.text}&rdquo; —{" "}
                <a href={quote.url} target="_blank" rel="noreferrer">
                  {quote.source}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Build Guidance</h2>
        <ul>
          <li>
            <strong>Recommended MVP:</strong> {opportunity.recommendedMvp}
          </li>
          <li>
            <strong>Target users:</strong> {opportunity.targetUsers}
          </li>
          <li>
            <strong>Build difficulty:</strong> {buildDifficulty.tier} — {buildDifficulty.explanation}
          </li>
          <li>
            <strong>Estimated time to MVP:</strong> {opportunity.estimatedTimeToMvp}
          </li>
          <li>
            <strong>Suggested pricing:</strong> {opportunity.suggestedPricing.suggestedPriceText}
          </li>
        </ul>
      </section>
    </div>
  );
}
