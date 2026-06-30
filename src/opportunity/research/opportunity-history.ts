import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { CourtVerdict } from "../decision/types.js";
import type { RankedOpportunity, AnalysisResult } from "./analysis-types.js";

// ---------------------------------------------------------------------------
// Opportunity History
// Tracks score/rank/verdict changes per opportunity across research sessions.
// Persisted to .founder-os/opportunity-history.json
// ---------------------------------------------------------------------------

export interface OpportunityHistoryEntry {
  sessionId: string;
  date: string;
  rank: number;
  finalScore: number;
  confidence: number;
  verdict: CourtVerdict;
  blueprintGenerated: boolean;
}

export interface OpportunityHistoryRecord {
  opportunityId: string;
  problemSummary: string;
  category: string;
  entries: OpportunityHistoryEntry[];  // chronological, oldest first
}

export interface ScoreChange {
  opportunityId: string;
  problemSummary: string;
  prevScore: number;
  currScore: number;
  delta: number;
  prevRank: number;
  currRank: number;
  prevVerdict: CourtVerdict;
  currVerdict: CourtVerdict;
  verdictChanged: boolean;
}

type HistoryMap = Record<string, OpportunityHistoryRecord>;

export class OpportunityHistoryTracker {
  private readonly path: string;
  private readonly dir: string;
  private history: HistoryMap = {};

  constructor(cwd: string = process.cwd()) {
    this.dir = join(cwd, ".founder-os");
    this.path = join(this.dir, "opportunity-history.json");
    this.load();
  }

  /** Record all ranked opportunities from an analysis result. */
  record(analysis: AnalysisResult): void {
    const date = analysis.runAt;
    for (const r of analysis.all) {
      const entry: OpportunityHistoryEntry = {
        sessionId: analysis.sessionId,
        date,
        rank: r.rank,
        finalScore: r.finalScore,
        confidence: r.intelligence.overallConfidence,
        verdict: r.decision.verdict,
        blueprintGenerated: r.blueprint !== undefined,
      };
      const key = r.opportunity.id;
      if (!this.history[key]) {
        this.history[key] = {
          opportunityId: key,
          problemSummary: r.opportunity.problemSummary,
          category: r.opportunity.category,
          entries: [],
        };
      }
      this.history[key]!.entries.push(entry);
    }
    this.save();
  }

  get(opportunityId: string): OpportunityHistoryRecord | undefined {
    return this.history[opportunityId];
  }

  getAll(): OpportunityHistoryRecord[] {
    return Object.values(this.history);
  }

  /** Score changes for opportunities that appear in both ranked lists. */
  computeChanges(
    prev: RankedOpportunity[],
    curr: RankedOpportunity[],
  ): ScoreChange[] {
    const prevMap = new Map(prev.map((r) => [r.opportunity.id, r]));
    const currMap = new Map(curr.map((r) => [r.opportunity.id, r]));
    const changes: ScoreChange[] = [];

    for (const [id, currR] of currMap) {
      const prevR = prevMap.get(id);
      if (!prevR) continue;
      const delta = currR.finalScore - prevR.finalScore;
      if (Math.abs(delta) < 0.001 && currR.rank === prevR.rank) continue;
      changes.push({
        opportunityId: id,
        problemSummary: currR.opportunity.problemSummary,
        prevScore: prevR.finalScore,
        currScore: currR.finalScore,
        delta,
        prevRank: prevR.rank,
        currRank: currR.rank,
        prevVerdict: prevR.decision.verdict,
        currVerdict: currR.decision.verdict,
        verdictChanged: prevR.decision.verdict !== currR.decision.verdict,
      });
    }

    return changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }

  private load(): void {
    if (!existsSync(this.path)) return;
    try {
      this.history = JSON.parse(readFileSync(this.path, "utf8")) as HistoryMap;
    } catch {
      this.history = {};
    }
  }

  private save(): void {
    try {
      mkdirSync(this.dir, { recursive: true });
      writeFileSync(this.path, JSON.stringify(this.history, null, 2), "utf8");
    } catch {
      // non-fatal
    }
  }
}
