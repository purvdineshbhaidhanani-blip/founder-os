import type { FounderOpportunityReport, TopOpportunitiesReport } from "./types.js";

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
