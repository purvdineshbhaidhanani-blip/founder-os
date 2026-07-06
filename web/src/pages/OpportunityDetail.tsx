import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getOpportunityDetail } from "../api/client";
import type { FounderOpportunityReport } from "../api/types";
import ConfidenceBadge from "../components/ConfidenceBadge";
import CopilotPanel from "../components/CopilotPanel";

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

  const {
    scoreBreakdown,
    fois,
    buyingIntent,
    competition,
    buildDifficulty,
    recommendation,
    supportingEvidence,
    decision,
    founderIntelligence,
    aiDecisionValidation,
    businessIntelligence,
    marketIntelligence,
    revenueIntelligence,
    mvpPlan,
    goToMarket,
    technicalBlueprint,
    knowledgeLinks,
  } = opportunity;
  const ai = aiDecisionValidation;

  return (
    <div className="page">
      <h1>{opportunity.problem}</h1>
      <p className="page-subtitle">Category: {opportunity.category}</p>
      <p>{opportunity.summary}</p>

      {pipelineId && opportunityId && <CopilotPanel pipelineId={pipelineId} opportunityId={opportunityId} />}

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

      {/*
        FOIS (Founder Opportunity Intelligence Score) — the report's real
        ranking key. Opportunities are sorted by fois.overall descending
        (src/opportunities/engine.ts), so it is surfaced as the primary score
        here, above the legacy scoreBreakdown composite below. Additive,
        read-only rendering — alters no section.
      */}
      <section className="card">
        <h2>FOIS — Opportunity Intelligence Score</h2>
        <p>
          <strong>{fois.overall.toFixed(1)}</strong> / 100 &middot; ranking key
        </p>
        <ul>
          {fois.dimensions.map((dimension) => (
            <li key={dimension.name}>
              <strong>{dimension.name}:</strong> {dimension.weighted.toFixed(1)} (raw {dimension.raw.toFixed(0)} &times; weight{" "}
              {dimension.weight.toFixed(2)}) — {dimension.reason}
            </li>
          ))}
        </ul>
        {fois.penalties.length > 0 && (
          <>
            <h3>Penalties</h3>
            <ul>
              {fois.penalties.map((penalty, index) => (
                <li key={index}>
                  &minus;{penalty.points}: {penalty.reason}
                </li>
              ))}
            </ul>
          </>
        )}
        {fois.weaknesses.length > 0 && (
          <>
            <h3>Weaknesses</h3>
            <ul>
              {fois.weaknesses.map((weakness, index) => (
                <li key={index}>{weakness}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card">
        <h2>Legacy Score Breakdown</h2>
        <p className="muted">
          Diagnostic composite retained for transparency. Not the ranking key — ranking uses FOIS above.
        </p>
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

      {/*
        Founder Intelligence, AI Decision Validation, and the Business/Market/
        Revenue/MVP/GTM/Technical/Knowledge bundles below are additive,
        READ-ONLY renderings of fields the backend already computes on every
        FounderOpportunityReport. No backend contract is changed; no field is
        invented. Sections reuse the existing card/badge/list design.
      */}
      <section className="card">
        <h2>Founder Intelligence</h2>
        <h3>Competitor Intelligence</h3>
        <p className="muted">{founderIntelligence.competitorIntelligence.explanation}</p>
        <ul>
          <li>
            <strong>Primary competitors:</strong>{" "}
            {founderIntelligence.competitorIntelligence.primaryCompetitors.join(", ") || "none detected"}
          </li>
          <li>
            <strong>Category:</strong> {founderIntelligence.competitorIntelligence.competitorCategory} &middot;{" "}
            <strong>Confidence:</strong> {founderIntelligence.competitorIntelligence.competitorConfidence}
          </li>
          <li>
            <strong>Open-source vs SaaS:</strong> {founderIntelligence.competitorIntelligence.openSourceVsSaas} &middot;{" "}
            <strong>Enterprise vs SMB:</strong> {founderIntelligence.competitorIntelligence.enterpriseVsSmb}
          </li>
          <li>
            <strong>Market maturity:</strong> {founderIntelligence.marketMaturity.maturity}
            {founderIntelligence.marketMaturity.reasons.length > 0 && (
              <span className="muted"> — {founderIntelligence.marketMaturity.reasons.join("; ")}</span>
            )}
          </li>
          <li>
            <strong>Competition pressure:</strong> {founderIntelligence.competitionPressure.pressure}
            <span className="muted"> — {founderIntelligence.competitionPressure.explanation}</span>
          </li>
        </ul>

        <h3>Market Gaps</h3>
        {founderIntelligence.marketGaps.length === 0 ? (
          <p className="muted">No evidence-backed market gaps detected.</p>
        ) : (
          <ul>
            {founderIntelligence.marketGaps.map((gap) => (
              <li key={gap.gap}>
                <strong>{gap.gap}</strong> — {gap.evidenceCount} evidence item(s), confidence {gap.confidence}
              </li>
            ))}
          </ul>
        )}

        <h3>Founder Opportunity</h3>
        <p>
          <span className={`badge ${founderIntelligence.founderOpportunity.shouldBuild ? "badge-verdict-build" : "badge-verdict-ignore"}`}>
            {founderIntelligence.founderOpportunity.shouldBuild ? "SHOULD BUILD" : "SHOULD NOT BUILD"}
          </span>
        </p>
        <ul>
          <li>
            <strong>Best customer:</strong> {founderIntelligence.founderOpportunity.bestCustomer} —{" "}
            {founderIntelligence.founderOpportunity.whyThisCustomer}
          </li>
          <li>
            <strong>Best pricing model:</strong> {founderIntelligence.founderOpportunity.bestPricingModel} &middot;{" "}
            <strong>MVP complexity:</strong> {founderIntelligence.founderOpportunity.expectedMvpComplexity} &middot;{" "}
            <strong>Solo-founder suitability:</strong> {founderIntelligence.founderOpportunity.soloFounderSuitability}
          </li>
        </ul>
        {founderIntelligence.founderOpportunity.why.length > 0 && (
          <>
            <h4>Why</h4>
            <ul>
              {founderIntelligence.founderOpportunity.why.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          </>
        )}
        {founderIntelligence.founderOpportunity.whyNot.length > 0 && (
          <>
            <h4>Why not</h4>
            <ul>
              {founderIntelligence.founderOpportunity.whyNot.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          </>
        )}

        <h3>Differentiation Strategies</h3>
        {founderIntelligence.differentiationStrategies.length === 0 ? (
          <p className="muted">No evidence-backed differentiation strategy surfaced.</p>
        ) : (
          <ul>
            {founderIntelligence.differentiationStrategies.map((strategy) => (
              <li key={strategy.strategy}>
                <strong>{strategy.strategy}</strong> — {strategy.evidenceReason}
              </li>
            ))}
          </ul>
        )}

        <h3>Risks (8-point taxonomy)</h3>
        <ul>
          {founderIntelligence.risks.map((risk) => (
            <li key={risk.risk}>
              <strong>{risk.risk}:</strong> {risk.severity} — {risk.explanation}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>AI Decision Validation</h2>
        <p>
          <span className={`badge ${decisionVerdictClass(ai.validation.validatedRecommendation)}`}>
            {ai.validation.validatedRecommendation}
          </span>{" "}
          <span className="badge">Confidence adjustment: {ai.validation.confidenceAdjustment}</span>
        </p>
        <p className="muted">{ai.validation.validationReason}</p>

        <h3>Executive Summary</h3>
        <p>{ai.finalRecommendation.executiveSummary}</p>
        <ul>
          <li>
            <strong>Recommended action:</strong> {ai.finalRecommendation.recommendedAction}
          </li>
          <li>
            <strong>Business opportunity:</strong> {ai.finalRecommendation.businessOpportunity}
          </li>
          <li>
            <strong>Pricing direction:</strong> {ai.finalRecommendation.suggestedPricingDirection}
          </li>
          <li>
            <strong>Go-to-market direction:</strong> {ai.finalRecommendation.goToMarketDirection}
          </li>
        </ul>

        <h3>Counter-Evidence (adversarial)</h3>
        <ul>
          {ai.counterEvidence.map((claim) => (
            <li key={claim.claim}>
              <span className={`badge ${claim.fired ? "badge-verdict-ignore" : "badge-verdict-build"}`}>
                {claim.fired ? "FIRED" : "clear"}
              </span>{" "}
              <strong>{claim.claim}</strong> — {claim.reason}
            </li>
          ))}
        </ul>

        <h3>Decision Reasoning</h3>
        <ul>
          <li>
            <strong>Actual business problem:</strong> {ai.decisionReasoning.actualBusinessProblem}
          </li>
          <li>
            <strong>Why it exists:</strong> {ai.decisionReasoning.whyExists}
          </li>
          <li>
            <strong>Why current solutions fail:</strong> {ai.decisionReasoning.whyCurrentSolutionsFailing}
          </li>
          <li>
            <strong>Pain is:</strong> {ai.decisionReasoning.painTemporaryOrRecurring}
          </li>
        </ul>

        <h3>Founder Risk Engine (0-100)</h3>
        <ul>
          {ai.risks.map((risk) => (
            <li key={risk.risk}>
              <strong>{risk.risk}:</strong> {risk.score}/100 — {risk.reason}
            </li>
          ))}
        </ul>

        <h3>Monetization Reasoning</h3>
        <ul>
          <li>
            <strong>Possible pricing:</strong> {ai.monetization.possiblePricing} (confidence:{" "}
            {ai.monetization.pricingConfidence})
          </li>
          <li>
            <strong>Subscription viability:</strong> {ai.monetization.subscriptionViability} &middot;{" "}
            <strong>Enterprise potential:</strong> {ai.monetization.enterprisePotential}
          </li>
        </ul>

        <h3>Confidence Review</h3>
        <p>
          <span className="badge">{ai.reviewedConfidence.verdict}</span> original{" "}
          {ai.reviewedConfidence.originalScore}/100 &rarr; adjusted {ai.reviewedConfidence.adjustedScore.toFixed(2)}{" "}
          (Δ {ai.reviewedConfidence.adjustment})
        </p>
        <p className="muted">{ai.reviewedConfidence.reason}</p>

        <h3>Explainability</h3>
        <ul>
          <li>
            <strong>Why build:</strong> {ai.explainability.whyBuild}
          </li>
          <li>
            <strong>Why wait:</strong> {ai.explainability.whyWait}
          </li>
          <li>
            <strong>Why ignore:</strong> {ai.explainability.whyIgnore}
          </li>
          <li>
            <strong>Evidence that matters most:</strong> {ai.explainability.evidenceThatMattersMost}
          </li>
          <li>
            <strong>Evidence missing:</strong> {ai.explainability.evidenceMissing}
          </li>
          <li>
            <strong>What could change this:</strong> {ai.explainability.whatCouldChangeThis}
          </li>
        </ul>

        {ai.finalRecommendation.unknowns.length > 0 && (
          <>
            <h3>Unknowns</h3>
            <ul>
              {ai.finalRecommendation.unknowns.map((unknown, index) => (
                <li key={index}>{unknown}</li>
              ))}
            </ul>
          </>
        )}
        {ai.finalRecommendation.nextValidationSteps.length > 0 && (
          <>
            <h3>Next Validation Steps</h3>
            <ul>
              {ai.finalRecommendation.nextValidationSteps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ul>
          </>
        )}

        <h3>Self Review</h3>
        <p>
          <span className={`badge ${ai.selfReview.internallyConsistent ? "badge-verdict-build" : "badge-verdict-ignore"}`}>
            {ai.selfReview.internallyConsistent ? "internally consistent" : "contradiction found"}
          </span>
        </p>
        <ul>
          {ai.selfReview.checks.map((check) => (
            <li key={check.check}>
              <strong>{check.check}:</strong> {check.consistent ? "ok" : "FIRED"} — {check.detail}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Business Intelligence</h2>
        <ul>
          <li>
            <strong>Business model:</strong> {businessIntelligence.businessModel}
            <span className="muted"> — {businessIntelligence.businessModelReason}</span>
          </li>
          <li>
            <strong>Revenue model:</strong> {businessIntelligence.revenueModel} &middot;{" "}
            <strong>Pricing model:</strong> {businessIntelligence.pricingModel}
          </li>
          <li>
            <strong>B2B vs B2C:</strong> {businessIntelligence.b2bVsB2c}
            <span className="muted"> — {businessIntelligence.b2bVsB2cReason}</span>
          </li>
          <li>
            <strong>Ideal customer:</strong> {businessIntelligence.idealCustomerProfile}
          </li>
          <li>
            <strong>Company size:</strong> {businessIntelligence.companySize}
            <span className="muted"> — {businessIntelligence.companySizeReason}</span>
          </li>
          <li>
            <strong>Primary buyer:</strong> {businessIntelligence.primaryBuyer}
            <span className="muted"> — {businessIntelligence.primaryBuyerReason}</span>
          </li>
          <li>
            <strong>Decision maker:</strong> {businessIntelligence.decisionMaker}
            <span className="muted"> — {businessIntelligence.decisionMakerReason}</span>
          </li>
          <li>
            <strong>Budget estimate:</strong> {businessIntelligence.budgetEstimate} (confidence:{" "}
            {businessIntelligence.budgetConfidence})
            <span className="muted"> — {businessIntelligence.budgetReason}</span>
          </li>
          <li>
            <strong>Urgency:</strong> {businessIntelligence.urgency}
            <span className="muted"> — {businessIntelligence.urgencyReason}</span>
          </li>
          <li>
            <strong>Switching difficulty:</strong> {businessIntelligence.switchingDifficulty}
            <span className="muted"> — {businessIntelligence.switchingDifficultyReason}</span>
          </li>
          <li>
            <strong>Expansion potential:</strong> {businessIntelligence.expansionPotential}
            <span className="muted"> — {businessIntelligence.expansionPotentialReason}</span>
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>Market Intelligence</h2>
        <ul>
          <li>
            <strong>Market maturity:</strong> {marketIntelligence.marketMaturity}
            {marketIntelligence.marketMaturityReasons.length > 0 && (
              <span className="muted"> — {marketIntelligence.marketMaturityReasons.join("; ")}</span>
            )}
          </li>
          <li>
            <strong>Growth stage:</strong> {marketIntelligence.growthStage}
            <span className="muted"> — {marketIntelligence.growthStageReason}</span>
          </li>
          <li>
            <strong>Saturation:</strong> {marketIntelligence.saturation}
            <span className="muted"> — {marketIntelligence.saturationReason}</span>
          </li>
          <li>
            <strong>Search confidence:</strong> {marketIntelligence.searchConfidence} &middot;{" "}
            <strong>Adoption confidence:</strong> {marketIntelligence.adoptionConfidence}
          </li>
          <li>
            <strong>Competition pressure:</strong> {marketIntelligence.competitionPressure}
          </li>
          <li>
            <strong>Opportunity window:</strong> {marketIntelligence.opportunityWindow}
            <span className="muted"> — {marketIntelligence.opportunityWindowReason}</span>
          </li>
          <li>
            <strong>Geo concentration:</strong> {marketIntelligence.geoConcentration} &middot;{" "}
            <strong>Industry concentration:</strong> {marketIntelligence.industryConcentration}
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>Revenue Analysis</h2>
        <ul>
          <li>
            <strong>Revenue potential:</strong> {revenueIntelligence.revenuePotential}
            <span className="muted"> — {revenueIntelligence.revenuePotentialReason}</span>
          </li>
          <li>
            <strong>Possible pricing:</strong> {revenueIntelligence.possiblePricing} (confidence:{" "}
            {revenueIntelligence.pricingConfidence})
          </li>
          <li>
            <strong>Revenue model:</strong> {revenueIntelligence.revenueModel} —{" "}
            {revenueIntelligence.revenueModelDescription}
          </li>
          <li>
            <strong>Subscription viability:</strong> {revenueIntelligence.subscriptionViability} &middot;{" "}
            <strong>Expansion potential:</strong> {revenueIntelligence.expansionPotential}
          </li>
          <li>
            <strong>Upsell potential:</strong> {revenueIntelligence.upsellPotential}
            <span className="muted"> — {revenueIntelligence.upsellPotentialReason}</span>
          </li>
          <li>
            <strong>Cross-sell potential:</strong> {revenueIntelligence.crossSellPotential}
            <span className="muted"> — {revenueIntelligence.crossSellPotentialReason}</span>
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>MVP Recommendations</h2>
        <p>{mvpPlan.scopeSummary}</p>
        <ul>
          <li>
            <strong>Recommended MVP:</strong> {mvpPlan.recommendedMvp}
          </li>
          <li>
            <strong>Estimated time to MVP:</strong> {mvpPlan.estimatedTimeToMvp} &middot;{" "}
            <strong>Build difficulty:</strong> {mvpPlan.buildDifficulty} — {mvpPlan.buildDifficultyExplanation}
          </li>
        </ul>
        {mvpPlan.coreFeatures.length > 0 && (
          <>
            <h3>Core Features</h3>
            <ul>
              {mvpPlan.coreFeatures.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </>
        )}
        <h3>Phased Roadmap</h3>
        {mvpPlan.phasedRoadmap.map((phase, index) => (
          <div key={index}>
            <h4>{phase.phase}</h4>
            <p className="muted">{phase.reason}</p>
            <ul>
              {phase.features.map((feature, featureIndex) => (
                <li key={featureIndex}>{feature}</li>
              ))}
            </ul>
          </div>
        ))}
        {mvpPlan.featuresToAvoidAtLaunch.length > 0 && (
          <>
            <h3>Deferred / Avoid at Launch</h3>
            <p className="muted">{mvpPlan.featuresToAvoidReason}</p>
            <ul>
              {mvpPlan.featuresToAvoidAtLaunch.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </>
        )}
        {mvpPlan.launchReadinessCriteria.length > 0 && (
          <>
            <h3>Launch Readiness Criteria</h3>
            <ul>
              {mvpPlan.launchReadinessCriteria.map((criterion, index) => (
                <li key={index}>{criterion}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card">
        <h2>Technical Recommendations</h2>
        <p className="muted">{technicalBlueprint.advisoryDisclaimer}</p>
        <ul>
          <li>
            <strong>Build difficulty:</strong> {technicalBlueprint.buildDifficulty} &middot;{" "}
            <strong>Expected MVP complexity:</strong> {technicalBlueprint.expectedMvpComplexity}
          </li>
          <li>
            <strong>Architecture:</strong> {technicalBlueprint.architectureAdvice}
            <span className="muted"> — {technicalBlueprint.architectureAdviceReason}</span>
          </li>
          <li>
            <strong>Database:</strong> {technicalBlueprint.databaseAdvice}
            <span className="muted"> — {technicalBlueprint.databaseAdviceReason}</span>
          </li>
          <li>
            <strong>API:</strong> {technicalBlueprint.apiAdvice}
            <span className="muted"> — {technicalBlueprint.apiAdviceReason}</span>
          </li>
          <li>
            <strong>Auth:</strong> {technicalBlueprint.authAdvice}
            <span className="muted"> — {technicalBlueprint.authAdviceReason}</span>
          </li>
          <li>
            <strong>AI layer:</strong> {technicalBlueprint.aiLayerAdvice}
            <span className="muted"> — {technicalBlueprint.aiLayerAdviceReason}</span>
          </li>
          <li>
            <strong>Hosting:</strong> {technicalBlueprint.hostingAdvice}
            <span className="muted"> — {technicalBlueprint.hostingAdviceReason}</span>
          </li>
          <li>
            <strong>Storage:</strong> {technicalBlueprint.storageAdvice}
            <span className="muted"> — {technicalBlueprint.storageAdviceReason}</span>
          </li>
        </ul>
      </section>

      <section className="card">
        <h2>Go-To-Market Recommendations</h2>
        <ul>
          <li>
            <strong>Launch strategy:</strong> {goToMarket.launchStrategy}
          </li>
          <li>
            <strong>Best customer:</strong> {goToMarket.bestCustomer} — {goToMarket.whyThisCustomer}
          </li>
          <li>
            <strong>Early adopter profile:</strong> {goToMarket.earlyAdopterProfile}
          </li>
          <li>
            <strong>Positioning:</strong> {goToMarket.positioningStatement}
          </li>
          <li>
            <strong>Positioning basis:</strong>{" "}
            {goToMarket.positioningBasis === "NOT VERIFIED"
              ? "NOT VERIFIED"
              : goToMarket.positioningBasis.join(", ")}
          </li>
        </ul>
        <h3>Recommended Channels</h3>
        <ul>
          {goToMarket.recommendedChannels.map((channel, index) => (
            <li key={index}>
              <strong>{channel.channel}</strong> — {channel.reason}
            </li>
          ))}
        </ul>
        <h3>Launch Sequence</h3>
        <ol>
          {goToMarket.launchSequence.map((step) => (
            <li key={step.step}>
              {step.action}
              <span className="muted"> — {step.reason}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h2>Knowledge Links</h2>
        <p className="muted">
          {knowledgeLinks.nodes.length} node(s), {knowledgeLinks.edges.length} edge(s) — typed references across
          this report&apos;s sections.
        </p>
        <h3>Nodes</h3>
        <ul>
          {knowledgeLinks.nodes.map((node) => (
            <li key={node.id}>
              <strong>[{node.type}]</strong> {node.label}
              <span className="muted"> — {node.reason}</span>
            </li>
          ))}
        </ul>
        <h3>Edges</h3>
        <ul>
          {knowledgeLinks.edges.map((edge, index) => (
            <li key={index}>
              <code>{edge.from}</code> <strong>{edge.relation}</strong> <code>{edge.to}</code>
              <span className="muted"> — {edge.reason}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
