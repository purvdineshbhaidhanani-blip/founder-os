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

/** decision.recommendation.verdict is BUILD/WATCH/IGNORE (Loop 3) — WATCH reuses the existing WAIT badge styling (no new CSS needed, matches this loop's additive-only UI constraint). */
function decisionVerdictClass(verdict: string): string {
  if (verdict === "BUILD") return "badge-verdict-build";
  if (verdict === "WATCH") return "badge-verdict-wait";
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

  const { scoreBreakdown, buyingIntent, competition, buildDifficulty, recommendation, supportingEvidence, decision } = opportunity;

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

      {/*
        Loop 3 Founder Decision layer — additive, read-only rendering of
        `opportunity.decision` (see src/opportunities/decision.ts). Does not
        alter any section above; `recommendation` above keeps its own
        BUILD/WAIT/IGNORE vocabulary untouched.
      */}
      <section className="card">
        <h2>Founder Decision</h2>
        <span className={`badge ${decisionVerdictClass(decision.recommendation.verdict)}`}>{decision.recommendation.verdict}</span>{" "}
        <span className="badge">Decision confidence: {decision.confidence.score}/100 ({decision.confidence.band})</span>
        <p>{decision.recommendation.justification}</p>
        <p>
          <strong>Primary opportunity:</strong> {decision.recommendation.primaryOpportunity}
        </p>
        <p>
          <strong>Primary risk:</strong> {decision.recommendation.primaryRisk}
        </p>
      </section>

      <section className="card">
        <h2>Decision Reasoning</h2>
        <ul>
          <li>
            <strong>Why this matters:</strong> {decision.reasoning.whyThisMatters}
          </li>
          <li>
            <strong>Why now:</strong> {decision.reasoning.whyNow}
          </li>
          <li>
            <strong>Who experiences this:</strong> {decision.reasoning.whoExperiences}
          </li>
          <li>
            <strong>What the evidence shows:</strong> {decision.reasoning.whatEvidence}
          </li>
          <li>
            <strong>Why founders would pay:</strong> {decision.reasoning.whyFoundersPay}
          </li>
          <li>
            <strong>Biggest uncertainty:</strong> {decision.reasoning.biggestUncertainty}
          </li>
          <li>
            <strong>Biggest implementation risk:</strong> {decision.reasoning.biggestImplementationRisk}
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>Intent Distribution</h2>
        {decision.intentDistribution.length === 0 ? (
          <p className="muted">No classified intent signal available for this cluster.</p>
        ) : (
          <ul>
            {decision.intentDistribution.map((entry) => (
              <li key={entry.intent}>
                {entry.intent}: {entry.count} item(s) ({(entry.fraction * 100).toFixed(0)}%)
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Evidence Intelligence</h2>
        <p>
          {decision.evidence.evidenceCount} item(s) &middot; {decision.evidence.uniqueSources} source(s) &middot;{" "}
          {decision.evidence.uniqueAuthors} author(s) &middot; freshness: {decision.evidence.freshness} &middot; cross-source
          agreement: {decision.evidence.crossSourceAgreement}
          {decision.evidence.echoChamber && (
            <>
              {" "}
              <span className="badge badge-verdict-ignore">Echo chamber risk</span>
            </>
          )}
        </p>
        <p className="muted">{decision.evidence.explanation}</p>
      </section>

      <section className="card">
        <h2>Decision Confidence Breakdown</h2>
        <ul>
          {decision.confidence.contributors.map((contributor) => (
            <li key={contributor.name}>
              <strong>{contributor.name}</strong> ({contributor.points} pts): {contributor.reason}
            </li>
          ))}
        </ul>
        {decision.confidence.weaknesses.length > 0 && (
          <>
            <h3>Weaknesses</h3>
            <ul>
              {decision.confidence.weaknesses.map((weakness, index) => (
                <li key={index}>{weakness}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card">
        <h2>Quality Gates</h2>
        <ul>
          {decision.qualityGates.map((gate) => (
            <li key={gate.name}>
              <strong>{gate.name}:</strong> {gate.fired ? "FIRED" : "ok"} — {gate.reason}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
