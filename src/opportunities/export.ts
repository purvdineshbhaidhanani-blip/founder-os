import type { AiDecisionValidation, FounderOpportunityReport, TopOpportunitiesReport } from "./types.js";

/**
 * `attachAiDecisionValidation` (ai-decision-validation.ts) always overwrites
 * `defaultAiDecisionValidation`'s placeholder text with real, computed
 * strings before a report is ever shipped in `TopOpportunitiesReport`. This
 * detector exists purely as a defensive guard so the exporter degrades to an
 * explicit "not available" message instead of rendering the literal
 * placeholder text or crashing, in the unlikely event a report reaches this
 * module before that attach step has run. It never fabricates content — it
 * only decides whether to render the real, already-computed fields.
 */
function isPlaceholderText(text: string | undefined | null): boolean {
  return !text || text.trim().length === 0 || text.trim().startsWith("Placeholder —");
}

/**
 * Renders the Loop 8 `aiDecisionValidation.finalRecommendation` +
 * `aiDecisionValidation.founderOpportunity` fields (already computed by
 * ai-decision-validation.ts, never recomputed here) as additive Markdown
 * sections. Read-only composition — see this file's module doc.
 */
function formatFounderIntelligence(aiDecisionValidation: AiDecisionValidation | undefined): string[] {
  const lines: string[] = [];
  const finalRecommendation = aiDecisionValidation?.finalRecommendation;
  const founderOpportunity = aiDecisionValidation?.founderOpportunity;

  if (!finalRecommendation || isPlaceholderText(finalRecommendation.executiveSummary)) {
    lines.push("### Executive Recommendation");
    lines.push("");
    lines.push("UNKNOWN — founder intelligence has not yet been computed for this opportunity.");
    lines.push("");
    return lines;
  }

  lines.push("## Executive Recommendation");
  lines.push("");
  lines.push(finalRecommendation.executiveSummary);
  lines.push("");
  lines.push(`**Recommended action:** ${finalRecommendation.recommendedAction}`);
  lines.push("");
  lines.push(`**Evidence summary:** ${finalRecommendation.evidenceSummary}`);
  lines.push("");
  lines.push(`**Business opportunity:** ${finalRecommendation.businessOpportunity}`);
  lines.push("");

  lines.push("### Business Playbook");
  lines.push("");
  if (finalRecommendation.recommendedMvp.length > 0) {
    lines.push("**Recommended MVP:**");
    for (const item of finalRecommendation.recommendedMvp) lines.push(`- ${item}`);
  } else {
    lines.push("**Recommended MVP:** UNKNOWN — no MVP features computed.");
  }
  lines.push("");
  lines.push(
    `**Suggested pricing direction:** ${
      isPlaceholderText(finalRecommendation.suggestedPricingDirection) ? "NOT VERIFIED" : finalRecommendation.suggestedPricingDirection
    }`,
  );
  lines.push("");
  lines.push(
    `**Go-to-market direction:** ${
      isPlaceholderText(finalRecommendation.goToMarketDirection) ? "NOT VERIFIED" : finalRecommendation.goToMarketDirection
    }`,
  );
  if (founderOpportunity) {
    lines.push("");
    lines.push(
      `**Ideal customer profile:** ${
        isPlaceholderText(founderOpportunity.idealCustomerProfile) ? "UNKNOWN" : founderOpportunity.idealCustomerProfile
      }`,
    );
    lines.push(
      `**Who should NOT be targeted:** ${
        isPlaceholderText(founderOpportunity.whoShouldNotBeTargeted) ? "UNKNOWN" : founderOpportunity.whoShouldNotBeTargeted
      }`,
    );
    lines.push(
      `**Early adopter profile:** ${
        isPlaceholderText(founderOpportunity.earlyAdopterProfile) ? "UNKNOWN" : founderOpportunity.earlyAdopterProfile
      }`,
    );
  }
  lines.push("");

  lines.push("### Founder Action Plan / Next Validation Steps");
  lines.push("");
  if (finalRecommendation.nextValidationSteps.length > 0) {
    for (const step of finalRecommendation.nextValidationSteps) lines.push(`- ${step}`);
  } else {
    lines.push("UNKNOWN — no validation steps computed.");
  }
  lines.push("");

  lines.push("### Risks");
  lines.push("");
  if (finalRecommendation.risks.length > 0) {
    for (const risk of finalRecommendation.risks) {
      lines.push(`- **${risk.risk}** (score: ${risk.score}/100): ${risk.reason}`);
    }
  } else {
    lines.push("UNKNOWN — no risks computed.");
  }
  lines.push("");

  lines.push("### Unknowns");
  lines.push("");
  if (finalRecommendation.unknowns.length > 0) {
    for (const unknown of finalRecommendation.unknowns) lines.push(`- ${unknown}`);
  } else {
    lines.push("None identified from already-computed evidence.");
  }
  lines.push("");

  return lines;
}

function formatOpportunity(rank: number, opportunity: FounderOpportunityReport): string {
  const lines: string[] = [];
  lines.push(`## ${rank}. ${opportunity.problem}`);
  lines.push("");
  lines.push(`**Category:** ${opportunity.category}`);
  lines.push("");
  lines.push(opportunity.summary);
  lines.push("");
  lines.push(`**Opportunity score:** ${opportunity.scoreBreakdown.weightedTotal.toFixed(3)}`);
  lines.push(`**Pain score:** ${opportunity.painScore.toFixed(2)}`);
  lines.push(`**Confidence:** ${opportunity.confidence.band} (${opportunity.confidence.score.toFixed(2)})`);
  lines.push("");
  lines.push(`### Recommendation: ${opportunity.recommendation.verdict}`);
  lines.push("");
  lines.push(opportunity.recommendation.explanation);
  if (opportunity.recommendation.whyBuild.length > 0) {
    lines.push("");
    lines.push("**Why build:**");
    for (const reason of opportunity.recommendation.whyBuild) lines.push(`- ${reason}`);
  }
  if (opportunity.recommendation.whyNotBuild.length > 0) {
    lines.push("");
    lines.push("**Why not build:**");
    for (const reason of opportunity.recommendation.whyNotBuild) lines.push(`- ${reason}`);
  }
  if (opportunity.recommendation.risk.length > 0) {
    lines.push("");
    lines.push("**Risk:**");
    for (const reason of opportunity.recommendation.risk) lines.push(`- ${reason}`);
  }

  lines.push("");
  lines.push("### Score breakdown");
  lines.push("");
  lines.push(opportunity.scoreBreakdown.explanation);

  lines.push("");
  lines.push("### Evidence");
  lines.push("");
  lines.push(
    `${opportunity.supportingEvidence.evidenceCount} item(s) across sources: ${Object.entries(
      opportunity.supportingEvidence.sourceBreakdown,
    )
      .map(([source, count]) => `${source}=${count}`)
      .join(", ")}.`,
  );
  lines.push(opportunity.buyingIntent.explanation);
  lines.push(opportunity.competition.explanation);

  if (opportunity.representativeQuotes.length > 0) {
    lines.push("");
    lines.push("### Representative quotes");
    lines.push("");
    for (const quote of opportunity.representativeQuotes) {
      lines.push(`- "${quote.text}" — [${quote.source}](${quote.url})`);
    }
  }

  lines.push("");
  lines.push("### Build guidance");
  lines.push("");
  lines.push(`- **Recommended MVP:** ${opportunity.recommendedMvp}`);
  lines.push(`- **Target users:** ${opportunity.targetUsers}`);
  lines.push(`- **Build difficulty:** ${opportunity.buildDifficulty.tier} — ${opportunity.buildDifficulty.explanation}`);
  lines.push(`- **Estimated time to MVP:** ${opportunity.estimatedTimeToMvp}`);
  lines.push(`- **Suggested pricing:** ${opportunity.suggestedPricing.suggestedPriceText}`);

  lines.push("");
  lines.push(...formatFounderIntelligence(opportunity.aiDecisionValidation));

  return lines.join("\n");
}

/** Renders a TopOpportunitiesReport as a readable Markdown document. */
export function exportAsMarkdown(report: TopOpportunitiesReport): string {
  const lines: string[] = [];
  lines.push("# Top Founder Opportunities");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Source session: ${report.sourceSessionId}`);
  lines.push(`Source problem report: ${report.sourceProblemReportId}`);
  lines.push(`Total clusters considered: ${report.totalClustersConsidered}`);
  lines.push(`Opportunities shown: ${report.opportunities.length}`);
  lines.push("");

  report.opportunities.forEach((opportunity, index) => {
    lines.push(formatOpportunity(index + 1, opportunity));
  });

  return lines.join("\n");
}

/** Renders a TopOpportunitiesReport as pretty-printed JSON. */
export function exportAsJson(report: TopOpportunitiesReport): string {
  return JSON.stringify(report, null, 2);
}
