import { Command } from "commander";
import { ResearchRunner } from "../../opportunity/research/research-runner.js";
import { SessionPersistence } from "../../opportunity/research/session-persistence.js";
import { stdout, stderr } from "../output.js";

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
}

const runCommand = new Command("run")
  .description("Run a research session and analyze opportunities")
  .option("--period <preset>", "Time preset: 7d | 30d | 90d (default: 30d)")
  .option("--since <date>", "Custom ISO start date (overrides --period)")
  .option("--until <date>", "Custom ISO end date (default: now)")
  .option("--limit <n>", "Max items per source (default: 30)")
  .option("--no-analysis", "Skip analysis pipeline after collection")
  .option("--json", "Output raw JSON instead of human summary")
  .action(async (opts: RunOptions) => {
    const preset = opts.period as "7d" | "30d" | "90d" | undefined;

    if (preset && !["7d", "30d", "90d"].includes(preset)) {
      stderr(`Invalid --period "${preset}". Use 7d, 30d, or 90d.`);
      process.exitCode = 1;
      return;
    }

    const limitPerSource = opts.limit ? parseInt(opts.limit, 10) : 30;
    if (isNaN(limitPerSource) || limitPerSource < 1) {
      stderr("--limit must be a positive integer.");
      process.exitCode = 1;
      return;
    }

    const runner = new ResearchRunner();

    if (!opts.json) {
      stdout("Starting research session...");
      if (opts.since) {
        stdout(`  Period: ${opts.since} → ${opts.until ?? "now"}`);
      } else {
        stdout(`  Period: ${preset ?? "30d"}`);
      }
      stdout(`  Limit per source: ${limitPerSource}`);
    }

    const { session, analysis } = await runner.runFull({
      preset,
      since: opts.since,
      until: opts.until,
      limitPerSource,
      runAnalysis: !opts.noAnalysis,
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

    // Human-readable summary
    stdout("");
    stdout(`Session: ${session.sessionId}`);
    stdout(`Status:  ${session.status}`);
    stdout(`Period:  ${session.period.label}`);
    stdout(`Items collected:  ${session.totalItemsCollected}`);
    stdout(`After dedup:      ${session.totalItemsAfterDedup}`);
    stdout(`Signals:          ${session.totalSignalsExtracted}`);
    stdout(`Opportunities:    ${session.totalOpportunitiesUpserted}`);
    stdout(`Duration:         ${session.durationMs}ms`);

    if (session.failedSources.length > 0) {
      stdout(`Failed sources:   ${session.failedSources.join(", ")}`);
    }

    if (analysis) {
      stdout("");
      stdout("── Analysis ─────────────────────────────────────────────");
      stdout(`Analyzed:  ${analysis.stats.opportunitiesAnalyzed}`);
      stdout(`Accepted:  ${analysis.stats.opportunitiesAccepted}`);
      stdout(`Rejected:  ${analysis.stats.opportunitiesRejected}`);
      stdout(`Avg confidence: ${(analysis.avgConfidence * 100).toFixed(1)}%`);

      const vb = analysis.stats.verdictBreakdown;
      const parts: string[] = [];
      for (const [v, n] of Object.entries(vb)) {
        if (n) parts.push(`${v}=${n}`);
      }
      stdout(`Verdicts:  ${parts.join("  ")}`);

      if (analysis.topOpportunity) {
        const top = analysis.topOpportunity;
        stdout("");
        stdout("Top Opportunity:");
        stdout(`  Problem:   ${top.opportunity.problemSummary}`);
        stdout(`  Verdict:   ${top.decision.verdict}`);
        stdout(`  Score:     ${(top.finalScore * 100).toFixed(1)}%`);
        stdout(`  Confidence: ${(top.intelligence.overallConfidence * 100).toFixed(1)}%`);
        stdout(`  Market:    ${top.intelligence.marketSizeEstimate.tier}`);
      }

      stdout("");
      stdout("Top 10 Opportunities:");
      for (const r of analysis.top10) {
        stdout(
          `  #${r.rank} [${r.decision.verdict}] ${r.opportunity.problemSummary.slice(0, 60)} ` +
          `(${(r.finalScore * 100).toFixed(0)}%)`,
        );
      }

      stdout("");
      stdout(`Summary: ${analysis.decisionSummary}`);
      stdout("Session persisted to .founder-os/research/");
    }
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
      stdout("No research sessions found in .founder-os/research/");
      return;
    }

    stdout(`Found ${records.length} session(s):`);
    for (const r of records) {
      const { session: s, analysis: a } = r;
      const analysisNote = a ? ` → ${a.stats.opportunitiesAccepted} accepted` : " (no analysis)";
      stdout(
        `  ${s.sessionId}  ${s.status.padEnd(9)}  ${s.period.label.padEnd(8)}  ` +
        `items=${s.totalItemsCollected}  opps=${s.totalOpportunitiesUpserted}${analysisNote}  [${s.startedAt.slice(0, 10)}]`,
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
        stdout(
          `  ${ss.source.padEnd(22)} items=${ss.itemsCollected}  signals=${ss.signalsExtracted}  ` +
          `${ss.durationMs}ms${cred}`,
        );
      }
    }

    if (a) {
      stdout("");
      stdout(`Analysis (${a.analysisId}):`);
      stdout(`  Analyzed: ${a.stats.opportunitiesAnalyzed}`);
      stdout(`  Accepted: ${a.stats.opportunitiesAccepted}`);
      stdout(`  Rejected: ${a.stats.opportunitiesRejected}`);
      if (a.topOpportunity) {
        stdout(`  Top: [${a.topOpportunity.decision.verdict}] ${a.topOpportunity.opportunity.problemSummary}`);
      }
    }
  });

// ---------------------------------------------------------------------------
// Composite research command
// ---------------------------------------------------------------------------

export const researchCommand = new Command("research")
  .description("Run and manage Opportunity Intelligence research sessions");

researchCommand.addCommand(runCommand);
researchCommand.addCommand(historyCommand);
researchCommand.addCommand(showCommand);
