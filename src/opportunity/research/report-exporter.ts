import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { PersistedResearchRecord } from "./session-persistence.js";
import type { RankedOpportunity } from "./analysis-types.js";
import type { BusinessBlueprint } from "../blueprint/types.js";

// ---------------------------------------------------------------------------
// Report Exporter — Markdown and JSON export of completed Founder Reports
// ---------------------------------------------------------------------------

export type ExportFormat = "md" | "json";

export interface ExportResult {
  format: ExportFormat;
  path: string;
  sizeBytes: number;
}

export class ReportExporter {
  private readonly exportDir: string;

  constructor(cwd: string = process.cwd()) {
    this.exportDir = join(cwd, ".founder-os", "exports");
  }

  export(record: PersistedResearchRecord, format: ExportFormat = "md"): ExportResult {
    this.ensureDir();
    const { session, analysis } = record;
    const filename = `${session.sessionId}.${format}`;
    const outputPath = join(this.exportDir, filename);

    const content = format === "json"
      ? JSON.stringify(record, null, 2)
      : this.toMarkdown(record);

    writeFileSync(outputPath, content, "utf8");
    return { format, path: outputPath, sizeBytes: Buffer.byteLength(content, "utf8") };
  }

  private toMarkdown(record: PersistedResearchRecord): string {
    const { session, analysis } = record;
    const lines: string[] = [];

    lines.push(`# Founder Research Report`);
    lines.push(`**Session:** ${session.sessionId}`);
    lines.push(`**Date:** ${session.startedAt.slice(0, 10)}`);
    lines.push(`**Period:** ${session.period.label}`);
    lines.push(`**Status:** ${session.status}`);
    lines.push(`**Duration:** ${session.durationMs}ms`);
    lines.push(``);

    lines.push(`## Collection Statistics`);
    lines.push(`- Items collected: ${session.totalItemsCollected}`);
    lines.push(`- After deduplication: ${session.totalItemsAfterDedup}`);
    lines.push(`- Signals extracted: ${session.totalSignalsExtracted}`);
    lines.push(`- Opportunities found: ${session.totalOpportunitiesUpserted}`);
    lines.push(``);

    lines.push(`## Sources`);
    for (const s of session.sourceStats) {
      const cred = s.credentialed ? "" : " *(no credentials)*";
      const err = s.errors.length > 0 ? ` — errors: ${s.errors.length}` : "";
      lines.push(`- **${s.source}**: ${s.itemsCollected} items, ${s.signalsExtracted} signals, ${s.durationMs}ms${cred}${err}`);
    }
    if (session.failedSources.length > 0) {
      lines.push(`- **Failed sources:** ${session.failedSources.join(", ")}`);
    }
    lines.push(``);

    if (!analysis) {
      lines.push(`*No analysis available for this session.*`);
      return lines.join("\n");
    }

    lines.push(`## Analysis`);
    lines.push(`- Opportunities analyzed: ${analysis.stats.opportunitiesAnalyzed}`);
    lines.push(`- Accepted: ${analysis.stats.opportunitiesAccepted}`);
    lines.push(`- Rejected: ${analysis.stats.opportunitiesRejected}`);
    lines.push(`- Blueprints generated: ${analysis.stats.blueprints.generated}`);
    lines.push(`- Average confidence: ${(analysis.avgConfidence * 100).toFixed(1)}%`);
    lines.push(``);

    const vb = analysis.stats.verdictBreakdown;
    lines.push(`### Verdict Breakdown`);
    for (const [v, n] of Object.entries(vb)) {
      if (n) lines.push(`- ${v}: ${n}`);
    }
    lines.push(``);

    lines.push(`## Executive Summary`);
    lines.push(analysis.decisionSummary);
    lines.push(``);

    if (analysis.topOpportunity) {
      lines.push(`## Champion Opportunity`);
      this.appendOpportunitySection(lines, analysis.topOpportunity);
    }

    lines.push(`## Top 10 Opportunities`);
    for (const r of analysis.top10) {
      lines.push(`### #${r.rank} ${r.opportunity.problemSummary.slice(0, 80)}`);
      lines.push(`**Verdict:** ${r.decision.verdict} | **Score:** ${(r.finalScore * 100).toFixed(1)}% | **Confidence:** ${(r.intelligence.overallConfidence * 100).toFixed(1)}%`);
      lines.push(`**Market:** ${r.intelligence.marketSizeEstimate.tier} | **Sources:** ${r.opportunity.sources.join(", ")}`);
      lines.push(`**Signals:** ${r.opportunity.signalCount} | **Buying intent:** ${r.opportunity.buyingIntentSignals}`);
      lines.push(``);
      if (r.blueprint) {
        this.appendBlueprintSummary(lines, r.blueprint);
      }
    }

    if (analysis.rejected.length > 0) {
      lines.push(`## Rejected Opportunities`);
      for (const r of analysis.rejected) {
        const reasons = r.intelligence.rejectionReasons.join(", ");
        lines.push(`- **${r.opportunity.problemSummary.slice(0, 70)}** — ${r.decision.verdict}: ${reasons}`);
      }
      lines.push(``);
    }

    if (analysis.evidenceSummary.length > 0) {
      lines.push(`## Evidence Summary`);
      for (const e of analysis.evidenceSummary) {
        lines.push(`- ${e}`);
      }
      lines.push(``);
    }

    lines.push(`---`);
    lines.push(`*Generated by Founder OS • ${new Date().toISOString()}*`);
    return lines.join("\n");
  }

  private appendOpportunitySection(lines: string[], r: RankedOpportunity): void {
    const opp = r.opportunity;
    const intel = r.intelligence;
    const dec = r.decision;
    lines.push(`**Problem:** ${opp.problemSummary}`);
    lines.push(`**Verdict:** ${dec.verdict} (confidence ${(dec.confidence * 100).toFixed(1)}%)`);
    lines.push(`**Intelligence score:** ${(intel.overallConfidence * 100).toFixed(1)}%`);
    lines.push(`**Market:** ${intel.marketSizeEstimate.tier} (~$${intel.marketSizeEstimate.estimatedTAMBillions}B TAM)`);
    lines.push(`**AI Readiness:** ${(intel.aiReadinessScore.score * 100).toFixed(0)}%`);
    lines.push(`**Technical feasibility:** ${(intel.technicalFeasibilityScore.score * 100).toFixed(0)}%`);
    lines.push(`**Buying intent signals:** ${opp.buyingIntentSignals}`);
    lines.push(``);

    if (opp.evidence.length > 0) {
      lines.push(`**Evidence:**`);
      for (const e of opp.evidence.slice(0, 5)) {
        lines.push(`> ${e.quote.slice(0, 200)} *(${e.source})*`);
      }
      lines.push(``);
    }

    if (dec.topArgumentsFor.length > 0) {
      lines.push(`**Top arguments for building:**`);
      for (const a of dec.topArgumentsFor.slice(0, 3)) {
        lines.push(`- ${a.claim}`);
      }
      lines.push(``);
    }

    if (dec.topArgumentsAgainst.length > 0) {
      lines.push(`**Top risks:**`);
      for (const a of dec.topArgumentsAgainst.slice(0, 3)) {
        lines.push(`- ${a.claim}`);
      }
      lines.push(``);
    }
  }

  private appendBlueprintSummary(lines: string[], bp: BusinessBlueprint): void {
    const rec = bp.founderRecommendation;
    lines.push(`**Blueprint:**`);
    lines.push(`- Verdict: ${rec.verdict} | Confidence: ${(bp.confidence * 100).toFixed(0)}%`);
    lines.push(`- Product: ${bp.productVision.vision.slice(0, 100)}`);
    lines.push(`- MVP: ${bp.mvpPlan.estimatedTimeline}`);
    lines.push(`- Revenue (base Y1): $${(bp.revenueScenarios.find(s => s.name === "base")?.year1ARR ?? 0).toLocaleString()}`);
    lines.push(`- Total dev cost: $${bp.costBreakdown.totalPreLaunchCost.toLocaleString()}`);
    lines.push(`- Breakeven: ${bp.breakevenAnalysis.monthsToBreakeven} months`);
    if (rec.immediateActions.length > 0) {
      lines.push(`- Next action: ${rec.immediateActions[0]}`);
    }
    lines.push(``);
  }

  private ensureDir(): void {
    try {
      mkdirSync(this.exportDir, { recursive: true });
    } catch {
      // ignore
    }
  }
}
