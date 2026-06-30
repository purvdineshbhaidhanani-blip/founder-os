import { Command } from "commander";
import { ResearchRunner } from "../../opportunity/research/research-runner.js";
import { SessionPersistence } from "../../opportunity/research/session-persistence.js";
import { ResearchConfigManager, ALL_SOURCES } from "../../opportunity/research/research-config.js";
import { ConnectorHealthTracker } from "../../opportunity/research/connector-health.js";
import { OpportunityHistoryTracker } from "../../opportunity/research/opportunity-history.js";
import { compareSessions } from "../../opportunity/research/session-comparison.js";
import { ReportExporter } from "../../opportunity/research/report-exporter.js";
import { loadCredentials } from "../../opportunity/research/env-loader.js";
import { stdout, stderr } from "../output.js";
import type { CollectorSource } from "../../opportunity/types.js";
import type { ResearchPeriodPreset } from "../../opportunity/research/types.js";
import type { ExportFormat } from "../../opportunity/research/report-exporter.js";

// ---------------------------------------------------------------------------
// Credential check helper
// ---------------------------------------------------------------------------

function validateCredentials(): boolean {
  const creds = loadCredentials();
  if (creds.missingKeys.length > 0) {
    stderr(`Missing credentials: ${creds.missingKeys.join(", ")}`);
    stderr("Set these environment variables or add them to .env.local before running research.");
    stderr("Required: GITHUB_TOKEN, YOUTUBE_API_KEY, STACKEXCHANGE_API_KEY");
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// research run — executes a full research + analysis session
// ---------------------------------------------------------------------------

interface RunOptions {
  period?: string;
  since?: string;
  until?: string;
  limit?: string;
  noAnalysis?: boolean;
  json?: boolean;
  sources?: string;
  resume?: string;
  retry?: string;
  skipCredCheck?: boolean;
}

const runCommand = new Command("run")
  .description("Run a research session and analyze opportunities")
  .option("--period <preset>", "Time preset: 7d | 30d | 90d (default from config)")
  .option("--since <date>", "Custom ISO start date (overrides --period)")
  .option("--until <date>", "Custom ISO end date (default: now)")
  .option("--limit <n>", "Max items per source (default: 30)")
  .option("--no-analysis", "Skip analysis pipeline after collection")
  .option("--json", "Output raw JSON instead of human summary")
  .option("--sources <list>", "Comma-separated sources to collect from")
  .option("--resume <sessionId>", "Resume a failed session from checkpoint")
  .option("--retry <sessionId>", "Retry only failed sources from a previous session")
  .option("--skip-cred-check", "Skip credential validation (warns but proceeds)")
  .action(async (opts: RunOptions) => {
    const configMgr = new ResearchConfigManager();
    const savedConfig = configMgr.load();

    const preset = (opts.period ?? savedConfig.period) as ResearchPeriodPreset;
    if (!["7d", "30d", "90d"].includes(preset) && !opts.since) {
      stderr(`Invalid --period "${preset}". Use 7d, 30d, or 90d.`);
      process.exitCode = 1;
      return;
    }

    const limitPerSource = opts.limit ? parseInt(opts.limit, 10) : savedConfig.limitPerSource;
    if (isNaN(limitPerSource) || limitPerSource < 1) {
      stderr("--limit must be a positive integer.");
      process.exitCode = 1;
      return;
    }

    // Source filtering
    let enabledSources: CollectorSource[] | undefined;
    if (opts.sources) {
      enabledSources = opts.sources.split(",").map((s) => s.trim()) as CollectorSource[];
    } else if (savedConfig.enabledSources.length < ALL_SOURCES.length) {
      enabledSources = savedConfig.enabledSources;
    }

    // Credential check
    if (!opts.skipCredCheck && !validateCredentials()) {
      process.exitCode = 1;
      return;
    }

    // Retry failed sources from a previous session
    let resumeSessionId = opts.resume;
    if (opts.retry) {
      const persistence = new SessionPersistence();
      const record = persistence.load(opts.retry);
      if (!record) {
        stderr(`Session "${opts.retry}" not found.`);
        process.exitCode = 1;
        return;
      }
      enabledSources = record.session.failedSources as CollectorSource[];
      if (enabledSources.length === 0) {
        stdout("No failed sources to retry.");
        return;
      }
      if (!opts.json) stdout(`Retrying failed sources: ${enabledSources.join(", ")}`);
    }

    const runner = new ResearchRunner();

    if (!opts.json) {
      stdout("Starting research session...");
      stdout(`  Period: ${opts.since ? `${opts.since} → ${opts.until ?? "now"}` : preset}`);
      stdout(`  Limit per source: ${limitPerSource}`);
      if (enabledSources) stdout(`  Sources: ${enabledSources.join(", ")}`);
      if (resumeSessionId) stdout(`  Resuming: ${resumeSessionId}`);
    }

    const { session, analysis } = await runner.runFull({
      preset,
      since: opts.since,
      until: opts.until,
      limitPerSource,
      runAnalysis: !opts.noAnalysis,
      enabledSources,
      resumeSessionId,
      onSourceComplete: (src, stats) => {
        if (!opts.json) {
          const status = stats.errors.length > 0 && stats.itemsCollected === 0
            ? "FAILED"
            : `${stats.itemsCollected} items`;
          stdout(`  [${src}] ${status} (${stats.durationMs}ms)`);
        }
      },
    });

    if (opts.json) {
      stdout(JSON.stringify({ session, analysis }, null, 2));
      return;
    }

    stdout("");
    stdout(`Session:   ${session.sessionId}`);
    stdout(`Status:    ${session.status}`);
    stdout(`Period:    ${session.period.label}`);
    stdout(`Items:     collected=${session.totalItemsCollected}  deduped=${session.totalItemsAfterDedup}`);
    stdout(`Signals:   ${session.totalSignalsExtracted}`);
    stdout(`Opps:      ${session.totalOpportunitiesUpserted}`);
    stdout(`Duration:  ${session.durationMs}ms`);
    if (session.failedSources.length > 0) {
      stdout(`Failed:    ${session.failedSources.join(", ")}`);
      stdout(`Tip: retry with: research run --retry ${session.sessionId}`);
    }

    if (analysis) {
      stdout("");
      stdout("── Analysis ─────────────────────────────────────────────");
      stdout(`Analyzed:   ${analysis.stats.opportunitiesAnalyzed}`);
      stdout(`Accepted:   ${analysis.stats.opportunitiesAccepted}`);
      stdout(`Rejected:   ${analysis.stats.opportunitiesRejected}`);
      stdout(`Blueprints: ${analysis.stats.blueprints.generated}`);
      stdout(`Avg conf:   ${(analysis.avgConfidence * 100).toFixed(1)}%`);

      const vb = analysis.stats.verdictBreakdown;
      const parts = Object.entries(vb).filter(([, n]) => n).map(([v, n]) => `${v}=${n}`);
      stdout(`Verdicts:   ${parts.join("  ")}`);

      if (analysis.topOpportunity) {
        const top = analysis.topOpportunity;
        stdout("");
        stdout("Top Opportunity:");
        stdout(`  Problem:    ${top.opportunity.problemSummary}`);
        stdout(`  Verdict:    ${top.decision.verdict}`);
        stdout(`  Score:      ${(top.finalScore * 100).toFixed(1)}%`);
        stdout(`  Confidence: ${(top.intelligence.overallConfidence * 100).toFixed(1)}%`);
        stdout(`  Market:     ${top.intelligence.marketSizeEstimate.tier}`);
        if (top.blueprint) {
          const bp = top.blueprint;
          stdout(`  Blueprint:  ${bp.founderRecommendation.verdict} (${(bp.confidence * 100).toFixed(0)}% conf)`);
          stdout(`  Revenue Y1: $${(bp.revenueScenarios.find(s => s.name === "base")?.year1ARR ?? 0).toLocaleString()} (base)`);
          stdout(`  Dev cost:   $${bp.costBreakdown.totalPreLaunchCost.toLocaleString()}`);
          stdout(`  Breakeven:  ${bp.breakevenAnalysis.monthsToBreakeven} months`);
        }
      }

      stdout("");
      stdout("Top 10 Opportunities:");
      for (const r of analysis.top10) {
        const bp = r.blueprint ? ` [BP:${r.blueprint.founderRecommendation.verdict}]` : "";
        stdout(`  #${r.rank} [${r.decision.verdict}]${bp} ${r.opportunity.problemSummary.slice(0, 55)} (${(r.finalScore * 100).toFixed(0)}%)`);
      }
      stdout("");
      stdout(`Summary: ${analysis.decisionSummary}`);
      stdout("Persisted → .founder-os/research/");
      stdout(`Export:   research export ${session.sessionId} --format md`);
    }
  });

// ---------------------------------------------------------------------------
// research dashboard — full stats overview
// ---------------------------------------------------------------------------

interface DashboardOptions {
  json?: boolean;
}

const dashboardCommand = new Command("dashboard")
  .description("Show full research dashboard: champion, history, health")
  .option("--json", "Output raw JSON")
  .action((opts: DashboardOptions) => {
    const persistence = new SessionPersistence();
    const health = new ConnectorHealthTracker();
    const records = persistence.loadAll();
    const analyzed = persistence.listAnalyzed();
    const champion = persistence.getChampion();

    if (opts.json) {
      stdout(JSON.stringify({ records, champion, connectorHealth: health.getAll() }, null, 2));
      return;
    }

    stdout("══════════════════════════════════════════");
    stdout("  FOUNDER OS — RESEARCH DASHBOARD");
    stdout("══════════════════════════════════════════");
    stdout(`  Total sessions:   ${records.length}`);
    stdout(`  Analyzed:         ${analyzed.length}`);
    const latest = records[0];
    if (latest) {
      stdout(`  Last run:         ${latest.session.startedAt.slice(0, 19).replace("T", " ")}`);
      stdout(`  Last status:      ${latest.session.status}`);
      stdout(`  Last duration:    ${latest.session.durationMs}ms`);
    }
    stdout("");

    // Champion
    if (champion) {
      const top = champion.record.analysis!.topOpportunity!;
      stdout("── Champion Opportunity ─────────────────");
      stdout(`  Problem:    ${top.opportunity.problemSummary}`);
      stdout(`  Verdict:    ${top.decision.verdict}`);
      stdout(`  Score:      ${(top.finalScore * 100).toFixed(1)}%`);
      stdout(`  Confidence: ${(top.intelligence.overallConfidence * 100).toFixed(1)}%`);
      stdout(`  Market:     ${top.intelligence.marketSizeEstimate.tier}`);
      stdout(`  Research:   ${champion.record.session.startedAt.slice(0, 10)}`);
      if (top.blueprint) {
        stdout(`  Blueprint:  ${top.blueprint.founderRecommendation.verdict}`);
        stdout(`  Revenue Y1: $${(top.blueprint.revenueScenarios.find(s => s.name === "base")?.year1ARR ?? 0).toLocaleString()}`);
        stdout(`  Next:       ${top.blueprint.founderRecommendation.immediateActions[0] ?? "—"}`);
      }
      stdout("");
    } else {
      stdout("  No champion yet. Run: research run --period 30d");
      stdout("");
    }

    // Top 10 across latest analyzed session
    const latestAnalyzed = analyzed[0];
    if (latestAnalyzed?.analysis) {
      const a = latestAnalyzed.analysis;
      stdout("── Latest Research Results ──────────────");
      stdout(`  Session: ${latestAnalyzed.session.sessionId}`);
      stdout(`  Date:    ${latestAnalyzed.session.startedAt.slice(0, 10)}`);
      stdout(`  Stats:   analyzed=${a.stats.opportunitiesAnalyzed}  accepted=${a.stats.opportunitiesAccepted}  rejected=${a.stats.opportunitiesRejected}`);
      stdout(`  Conf:    avg=${(a.avgConfidence * 100).toFixed(1)}%`);
      stdout("");
      stdout("  Top 10 Opportunities:");
      for (const r of a.top10) {
        stdout(`    #${String(r.rank).padEnd(2)} [${r.decision.verdict.padEnd(12)}] ${r.opportunity.problemSummary.slice(0, 50)}`);
      }
      if (a.rejected.length > 0) {
        stdout(`  Rejected: ${a.rejected.length} opportunities`);
      }
      stdout("");
    }

    // Connector health
    const allHealth = health.getAll();
    if (allHealth.length > 0) {
      stdout("── Connector Health ─────────────────────");
      for (const h of allHealth) {
        const successRate = h.totalRuns > 0 ? Math.round((h.successRuns / h.totalRuns) * 100) : 0;
        const last = h.lastSuccessfulRun ? h.lastSuccessfulRun.slice(0, 10) : "never";
        stdout(`  ${h.source.padEnd(24)} ${h.status.padEnd(8)} ${successRate}% success  last=${last}  items=${h.totalItemsCollected}`);
      }
      stdout("");
    }

    // Recent sessions
    if (records.length > 0) {
      stdout("── Research History (last 5) ────────────");
      for (const r of records.slice(0, 5)) {
        const a = r.analysis;
        const note = a ? `opps=${a.stats.opportunitiesAccepted}ac/${a.stats.opportunitiesRejected}rej` : "no analysis";
        stdout(`  ${r.session.sessionId}  ${r.session.status.padEnd(9)}  ${r.session.period.label.padEnd(8)}  ${note}  [${r.session.startedAt.slice(0, 10)}]`);
      }
    }
    stdout("");
    stdout("Commands: research run | research report | research compare | research export");
  });

// ---------------------------------------------------------------------------
// research history — list persisted sessions
// ---------------------------------------------------------------------------

interface HistoryOptions {
  limit?: string;
  json?: boolean;
}

const historyCommand = new Command("history")
  .description("List past research sessions persisted to disk")
  .option("--limit <n>", "Max sessions to show (default: 10)")
  .option("--json", "Output raw JSON")
  .action((opts: HistoryOptions) => {
    const limit = opts.limit ? parseInt(opts.limit, 10) : 10;
    const persistence = new SessionPersistence();
    const records = persistence.loadAll().slice(0, limit);

    if (opts.json) {
      stdout(JSON.stringify(records, null, 2));
      return;
    }

    if (records.length === 0) {
      stdout("No research sessions found. Run: research run --period 30d");
      return;
    }

    stdout(`${records.length} session(s):`);
    for (const r of records) {
      const { session: s, analysis: a } = r;
      const note = a
        ? ` → accepted=${a.stats.opportunitiesAccepted}  rejected=${a.stats.opportunitiesRejected}  blueprints=${a.stats.blueprints.generated}`
        : " (no analysis)";
      stdout(
        `  ${s.sessionId}  ${s.status.padEnd(9)}  ${s.period.label.padEnd(8)}  ` +
        `items=${s.totalItemsCollected}  opps=${s.totalOpportunitiesUpserted}${note}  [${s.startedAt.slice(0, 10)}]`,
      );
    }
  });

// ---------------------------------------------------------------------------
// research show — show details of one session
// ---------------------------------------------------------------------------

const showCommand = new Command("show")
  .description("Show details of a persisted research session")
  .argument("<sessionId>", "Session ID (from research history)")
  .option("--json", "Output raw JSON")
  .action((sessionId: string, opts: { json?: boolean }) => {
    const persistence = new SessionPersistence();
    const record = persistence.load(sessionId);

    if (!record) {
      stderr(`Session "${sessionId}" not found in .founder-os/research/`);
      process.exitCode = 1;
      return;
    }

    if (opts.json) {
      stdout(JSON.stringify(record, null, 2));
      return;
    }

    const { session: s, analysis: a } = record;
    stdout(`Session:   ${s.sessionId}`);
    stdout(`Status:    ${s.status}`);
    stdout(`Period:    ${s.period.label}`);
    stdout(`Started:   ${s.startedAt}`);
    stdout(`Completed: ${s.completedAt ?? "—"}`);
    stdout(`Duration:  ${s.durationMs}ms`);
    stdout(`Items:     collected=${s.totalItemsCollected}  deduped=${s.totalItemsAfterDedup}`);
    stdout(`Signals:   ${s.totalSignalsExtracted}`);
    stdout(`Opps:      ${s.totalOpportunitiesUpserted}`);

    if (s.sourceStats.length > 0) {
      stdout("Sources:");
      for (const ss of s.sourceStats) {
        const cred = ss.credentialed ? "" : " (no creds)";
        stdout(`  ${ss.source.padEnd(24)} items=${ss.itemsCollected}  signals=${ss.signalsExtracted}  ${ss.durationMs}ms${cred}`);
      }
    }

    if (a) {
      stdout("");
      stdout(`Analysis (${a.analysisId}):`);
      stdout(`  Analyzed:   ${a.stats.opportunitiesAnalyzed}`);
      stdout(`  Accepted:   ${a.stats.opportunitiesAccepted}`);
      stdout(`  Rejected:   ${a.stats.opportunitiesRejected}`);
      stdout(`  Blueprints: ${a.stats.blueprints.generated}`);
      const vb = a.stats.verdictBreakdown;
      const vparts = Object.entries(vb).filter(([, n]) => n).map(([v, n]) => `${v}=${n}`);
      stdout(`  Verdicts:   ${vparts.join("  ")}`);
      if (a.topOpportunity) {
        stdout(`  Top: [${a.topOpportunity.decision.verdict}] ${a.topOpportunity.opportunity.problemSummary}`);
      }
    }
  });

// ---------------------------------------------------------------------------
// research report — detailed Founder Report for a session
// ---------------------------------------------------------------------------

interface ReportOptions {
  json?: boolean;
  sessionId?: string;
}

const reportCommand = new Command("report")
  .description("Generate a detailed Founder Report for a research session")
  .argument("[sessionId]", "Session ID (default: latest)")
  .option("--json", "Output JSON instead of Markdown")
  .action((sessionId: string | undefined, opts: ReportOptions) => {
    const persistence = new SessionPersistence();
    let record = sessionId ? persistence.load(sessionId) : persistence.latest();

    if (!record) {
      stderr(sessionId ? `Session "${sessionId}" not found.` : "No sessions found. Run: research run");
      process.exitCode = 1;
      return;
    }

    const { session: s, analysis: a } = record;

    if (opts.json) {
      stdout(JSON.stringify(record, null, 2));
      return;
    }

    stdout(`# FOUNDER REPORT — ${s.sessionId}`);
    stdout(`Date: ${s.startedAt.slice(0, 10)} | Period: ${s.period.label} | Status: ${s.status}`);
    stdout("");

    stdout("## Collection");
    stdout(`  Items: ${s.totalItemsCollected} collected → ${s.totalItemsAfterDedup} after dedup`);
    stdout(`  Signals: ${s.totalSignalsExtracted} | Opportunities: ${s.totalOpportunitiesUpserted}`);
    stdout(`  Duration: ${s.durationMs}ms`);

    if (s.failedSources.length > 0) {
      stdout(`  WARNINGS: ${s.failedSources.join(", ")} failed`);
    }
    stdout("");

    if (!a) {
      stdout("No analysis available. Re-run: research run");
      return;
    }

    stdout("## Analysis Results");
    stdout(`  Analyzed: ${a.stats.opportunitiesAnalyzed} | Accepted: ${a.stats.opportunitiesAccepted} | Rejected: ${a.stats.opportunitiesRejected}`);
    stdout(`  Blueprints: ${a.stats.blueprints.generated} | Avg confidence: ${(a.avgConfidence * 100).toFixed(1)}%`);
    stdout(`  ${a.decisionSummary}`);
    stdout("");

    if (a.topOpportunity) {
      const top = a.topOpportunity;
      const intel = top.intelligence;
      stdout("## Champion Opportunity — BUILD DECISION");
      stdout(`  Problem:     ${top.opportunity.problemSummary}`);
      stdout(`  Verdict:     ${top.decision.verdict}`);
      stdout(`  Score:       ${(top.finalScore * 100).toFixed(1)}%`);
      stdout(`  Confidence:  ${(intel.overallConfidence * 100).toFixed(1)}%`);
      stdout(`  Market:      ${intel.marketSizeEstimate.tier} (~$${intel.marketSizeEstimate.estimatedTAMBillions}B TAM)`);
      stdout(`  AI Ready:    ${(intel.aiReadinessScore.score * 100).toFixed(0)}%`);
      stdout(`  Tech Feas:   ${(intel.technicalFeasibilityScore.score * 100).toFixed(0)}%`);
      stdout(`  Buying Int:  ${top.opportunity.buyingIntentSignals} signals`);
      stdout(`  Sources:     ${top.opportunity.sources.join(", ")}`);
      stdout(`  Signals:     ${top.opportunity.signalCount}`);
      stdout("");

      if (top.opportunity.evidence.length > 0) {
        stdout("  Evidence:");
        for (const e of top.opportunity.evidence.slice(0, 5)) {
          stdout(`    "${e.quote.slice(0, 150)}" [${e.source}]`);
        }
        stdout("");
      }

      if (top.decision.topArgumentsFor.length > 0) {
        stdout("  Court — For:");
        for (const arg of top.decision.topArgumentsFor.slice(0, 3)) {
          stdout(`    + ${arg.claim}`);
        }
      }
      if (top.decision.topArgumentsAgainst.length > 0) {
        stdout("  Court — Against:");
        for (const arg of top.decision.topArgumentsAgainst.slice(0, 3)) {
          stdout(`    - ${arg.claim}`);
        }
      }
      stdout(`  Court summary: ${top.decision.executiveSummary}`);
      stdout("");

      if (top.blueprint) {
        const bp = top.blueprint;
        stdout("  ## Business Blueprint");
        stdout(`  Recommendation: ${bp.founderRecommendation.verdict} (${(bp.confidence * 100).toFixed(0)}% conf)`);
        stdout(`  Product:    ${bp.productVision.vision}`);
        stdout(`  UVP:        ${bp.productVision.uvp}`);
        stdout(`  MVP:        ${bp.mvpPlan.estimatedTimeline}`);
        stdout(`  Pricing:    ${bp.pricingRecommendation.model} — ${bp.pricingRecommendation.tiers.map(t => `$${t.monthlyPrice}/mo`).join(", ")}`);
        const base = bp.revenueScenarios.find(s => s.name === "base");
        if (base) {
          stdout(`  Revenue Y1: $${base.year1ARR.toLocaleString()} | Y2: $${base.year2ARR.toLocaleString()} | Y3: $${base.year3ARR.toLocaleString()}`);
        }
        stdout(`  Dev cost:   $${bp.costBreakdown.totalPreLaunchCost.toLocaleString()} (team=${bp.costBreakdown.development.teamSize}, ${bp.costBreakdown.development.monthsToMVP}mo)`);
        stdout(`  Monthly:    $${bp.costBreakdown.totalMonthlyBurn.toLocaleString()} burn`);
        stdout(`  Breakeven:  ${bp.breakevenAnalysis.monthsToBreakeven} months at ${bp.breakevenAnalysis.customersNeeded} customers`);
        stdout(`  ROI 3yr:    ${bp.roiAnalysis.projectedROIPercent.toFixed(0)}%`);
        const topRisk = bp.riskAnalysis.topRisk;
        stdout(`  Top risk:   ${topRisk}`);
        if (bp.founderRecommendation.immediateActions.length > 0) {
          stdout("  Immediate actions:");
          for (const action of bp.founderRecommendation.immediateActions) {
            stdout(`    → ${action}`);
          }
        }
        stdout("");
      }
    }

    stdout("## Top 10");
    for (const r of a.top10) {
      const bp = r.blueprint;
      const bpNote = bp ? ` | Blueprint: ${bp.founderRecommendation.verdict}` : "";
      stdout(`  #${r.rank} [${r.decision.verdict}] ${r.opportunity.problemSummary.slice(0, 60)}`);
      stdout(`     Score=${(r.finalScore * 100).toFixed(0)}%  Conf=${(r.intelligence.overallConfidence * 100).toFixed(0)}%  Market=${r.intelligence.marketSizeEstimate.tier}${bpNote}`);
    }

    if (a.rejected.length > 0) {
      stdout("");
      stdout("## Rejected");
      for (const r of a.rejected) {
        stdout(`  [${r.decision.verdict}] ${r.opportunity.problemSummary.slice(0, 60)} — ${r.intelligence.rejectionReasons.join(", ")}`);
      }
    }

    stdout("");
    stdout(`Export: research export ${s.sessionId} --format md`);
  });

// ---------------------------------------------------------------------------
// research export — export session as Markdown or JSON
// ---------------------------------------------------------------------------

interface ExportOptions {
  format?: string;
}

const exportCommand = new Command("export")
  .description("Export a research session report to file")
  .argument("[sessionId]", "Session ID (default: latest)")
  .option("--format <fmt>", "Export format: md | json (default: md)")
  .action((sessionId: string | undefined, opts: ExportOptions) => {
    const persistence = new SessionPersistence();
    const record = sessionId ? persistence.load(sessionId) : persistence.latest();

    if (!record) {
      stderr(sessionId ? `Session "${sessionId}" not found.` : "No sessions. Run: research run");
      process.exitCode = 1;
      return;
    }

    const fmt = (opts.format ?? "md") as ExportFormat;
    if (!["md", "json"].includes(fmt)) {
      stderr(`Unsupported format "${fmt}". Use md or json.`);
      process.exitCode = 1;
      return;
    }

    const exporter = new ReportExporter();
    const result = exporter.export(record, fmt);
    stdout(`Exported: ${result.path} (${result.sizeBytes} bytes)`);
  });

// ---------------------------------------------------------------------------
// research compare — diff two sessions
// ---------------------------------------------------------------------------

const compareCommand = new Command("compare")
  .description("Compare two research sessions and show opportunity changes")
  .argument("<idA>", "Older session ID")
  .argument("<idB>", "Newer session ID")
  .option("--json", "Output raw JSON")
  .action((idA: string, idB: string, opts: { json?: boolean }) => {
    const persistence = new SessionPersistence();
    const recA = persistence.load(idA);
    const recB = persistence.load(idB);

    if (!recA) { stderr(`Session "${idA}" not found.`); process.exitCode = 1; return; }
    if (!recB) { stderr(`Session "${idB}" not found.`); process.exitCode = 1; return; }

    const result = compareSessions(recA.session, recA.analysis, recB.session, recB.analysis);

    if (opts.json) {
      stdout(JSON.stringify(result, null, 2));
      return;
    }

    stdout(`Comparing: ${idA} → ${idB}`);
    stdout(`  A: ${recA.session.startedAt.slice(0, 10)} (${result.summary.totalA} opps)`);
    stdout(`  B: ${recB.session.startedAt.slice(0, 10)} (${result.summary.totalB} opps)`);
    stdout("");
    stdout(`New:     ${result.summary.newCount}`);
    stdout(`Removed: ${result.summary.removedCount}`);
    stdout(`Changed: ${result.summary.changedCount}`);

    if (result.championChange.changed) {
      stdout("");
      stdout("Champion Change:");
      stdout(`  Was: ${result.championChange.prevChampion ?? "none"}`);
      stdout(`  Now: ${result.championChange.currChampion ?? "none"}`);
    }

    if (result.newOpportunities.length > 0) {
      stdout("");
      stdout("New Opportunities:");
      for (const o of result.newOpportunities) {
        stdout(`  #${o.rank} [${o.verdict}] ${o.problemSummary.slice(0, 60)}`);
      }
    }

    if (result.removedOpportunities.length > 0) {
      stdout("");
      stdout("Removed:");
      for (const o of result.removedOpportunities) {
        stdout(`  ${o.problemSummary.slice(0, 60)}`);
      }
    }

    if (result.scoreChanges.length > 0) {
      stdout("");
      stdout("Score Changes (top 10):");
      for (const c of result.scoreChanges.slice(0, 10)) {
        const dir = c.scoreDelta >= 0 ? "↑" : "↓";
        const rankDir = c.rankDelta > 0 ? `↑${c.rankDelta}` : c.rankDelta < 0 ? `↓${Math.abs(c.rankDelta)}` : "=";
        const vChange = c.verdictChanged ? ` [${c.prevVerdict}→${c.currVerdict}]` : "";
        stdout(`  ${dir} ${(Math.abs(c.scoreDelta) * 100).toFixed(1)}%  rank${rankDir}${vChange}  ${c.problemSummary.slice(0, 50)}`);
      }
    }
  });

// ---------------------------------------------------------------------------
// research search — search opportunities across sessions
// ---------------------------------------------------------------------------

interface SearchOptions {
  session?: string;
  limit?: string;
  json?: boolean;
}

const searchCommand = new Command("search")
  .description("Search opportunities across persisted sessions by keyword")
  .argument("<query>", "Keyword to search in opportunity problem summaries")
  .option("--session <id>", "Limit search to a specific session")
  .option("--limit <n>", "Max results (default: 20)")
  .option("--json", "Output raw JSON")
  .action((query: string, opts: SearchOptions) => {
    const persistence = new SessionPersistence();
    const limit = opts.limit ? parseInt(opts.limit, 10) : 20;
    const results = persistence.search(query, { sessionId: opts.session, maxResults: limit });

    if (opts.json) {
      stdout(JSON.stringify(results, null, 2));
      return;
    }

    if (results.length === 0) {
      stdout(`No opportunities matching "${query}".`);
      return;
    }

    stdout(`${results.length} result(s) for "${query}":`);
    for (const { sessionId, rank: r } of results) {
      stdout(`  [${sessionId.slice(0, 16)}] #${r.rank} [${r.decision.verdict}] ${r.opportunity.problemSummary.slice(0, 60)} (${(r.finalScore * 100).toFixed(0)}%)`);
    }
  });

// ---------------------------------------------------------------------------
// research health — connector health display
// ---------------------------------------------------------------------------

interface HealthOptions {
  json?: boolean;
}

const healthCommand = new Command("health")
  .description("Show connector health stats")
  .option("--json", "Output raw JSON")
  .action((opts: HealthOptions) => {
    const tracker = new ConnectorHealthTracker();
    const all = tracker.getAll();

    if (opts.json) {
      stdout(JSON.stringify(all, null, 2));
      return;
    }

    if (all.length === 0) {
      stdout("No connector health data yet. Run: research run");
      return;
    }

    stdout("Connector Health:");
    for (const h of all) {
      const successRate = h.totalRuns > 0 ? Math.round((h.successRuns / h.totalRuns) * 100) : 0;
      stdout(`  ${h.source.padEnd(24)} ${h.status.padEnd(10)} ${successRate}% success`);
      stdout(`    Items=${h.totalItemsCollected}  Runs=${h.totalRuns}  AvgDuration=${h.avgDurationMs}ms`);
      if (h.lastSuccessfulRun) stdout(`    Last OK: ${h.lastSuccessfulRun.slice(0, 19)}`);
      if (h.lastFailure) stdout(`    Last fail: ${h.lastFailure.slice(0, 19)}  Error: ${h.lastError ?? "—"}`);
    }
  });

// ---------------------------------------------------------------------------
// research config — view/set research configuration
// ---------------------------------------------------------------------------

interface ConfigOptions {
  period?: string;
  sources?: string;
  limit?: string;
  reset?: boolean;
  json?: boolean;
}

const configCommand = new Command("config")
  .description("View or update persisted research configuration")
  .option("--period <preset>", "Set default period: 7d | 30d | 90d")
  .option("--sources <list>", "Comma-separated enabled sources")
  .option("--limit <n>", "Default limit per source")
  .option("--reset", "Reset to defaults")
  .option("--json", "Output raw JSON")
  .action((opts: ConfigOptions) => {
    const mgr = new ResearchConfigManager();

    if (opts.reset) {
      const cfg = mgr.reset();
      stdout(`Config reset. Saved to .founder-os/config.json`);
      if (opts.json) stdout(JSON.stringify(cfg, null, 2));
      return;
    }

    const updates: Record<string, unknown> = {};
    if (opts.period) {
      if (!["7d", "30d", "90d"].includes(opts.period)) {
        stderr(`Invalid period "${opts.period}". Use 7d, 30d, or 90d.`);
        process.exitCode = 1;
        return;
      }
      updates["period"] = opts.period;
    }
    if (opts.sources) {
      updates["enabledSources"] = opts.sources.split(",").map((s) => s.trim());
    }
    if (opts.limit) {
      const n = parseInt(opts.limit, 10);
      if (isNaN(n) || n < 1) { stderr("--limit must be positive integer."); process.exitCode = 1; return; }
      updates["limitPerSource"] = n;
    }

    const cfg = Object.keys(updates).length > 0 ? mgr.save(updates) : mgr.load();

    if (opts.json) {
      stdout(JSON.stringify(cfg, null, 2));
      return;
    }

    stdout(`Research Configuration (.founder-os/config.json):`);
    stdout(`  period:         ${cfg.period}`);
    stdout(`  limitPerSource: ${cfg.limitPerSource}`);
    stdout(`  enabledSources: ${cfg.enabledSources.join(", ")}`);
    stdout(`  savedAt:        ${cfg.savedAt}`);
  });

// ---------------------------------------------------------------------------
// research history-opp — opportunity history across sessions
// ---------------------------------------------------------------------------

interface OppHistoryOptions {
  json?: boolean;
}

const oppHistoryCommand = new Command("opp-history")
  .description("Show score/rank history for opportunities across sessions")
  .argument("[opportunityId]", "Specific opportunity ID (default: all)")
  .option("--json", "Output raw JSON")
  .action((opportunityId: string | undefined, opts: OppHistoryOptions) => {
    const tracker = new OpportunityHistoryTracker();
    const records = opportunityId
      ? [tracker.get(opportunityId)].filter(Boolean) as ReturnType<typeof tracker.getAll>
      : tracker.getAll();

    if (opts.json) {
      stdout(JSON.stringify(records, null, 2));
      return;
    }

    if (records.length === 0) {
      stdout("No opportunity history. Run multiple research sessions to track changes.");
      return;
    }

    for (const rec of records.slice(0, 20)) {
      stdout(`${rec.opportunityId} — ${rec.problemSummary.slice(0, 50)}`);
      for (const e of rec.entries) {
        stdout(`  [${e.date.slice(0, 10)}] rank=#${e.rank}  score=${(e.finalScore * 100).toFixed(0)}%  conf=${(e.confidence * 100).toFixed(0)}%  verdict=${e.verdict}`);
      }
    }
  });

// ---------------------------------------------------------------------------
// Composite research command
// ---------------------------------------------------------------------------

export const researchCommand = new Command("research")
  .description("Run and manage Opportunity Intelligence research sessions");

researchCommand.addCommand(runCommand);
researchCommand.addCommand(dashboardCommand);
researchCommand.addCommand(historyCommand);
researchCommand.addCommand(showCommand);
researchCommand.addCommand(reportCommand);
researchCommand.addCommand(exportCommand);
researchCommand.addCommand(compareCommand);
researchCommand.addCommand(searchCommand);
researchCommand.addCommand(healthCommand);
researchCommand.addCommand(configCommand);
researchCommand.addCommand(oppHistoryCommand);
