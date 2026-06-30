import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ResearchSession } from "./types.js";
import type { AnalysisResult } from "./analysis-types.js";

// ---------------------------------------------------------------------------
// Session Persistence
// Writes research sessions + analysis results as JSON to disk so they survive
// process restarts. Default location: <cwd>/.founder-os/research/
// ---------------------------------------------------------------------------

export interface PersistedResearchRecord {
  session: ResearchSession;
  analysis: AnalysisResult | null;
  persistedAt: string;
}

export class SessionPersistence {
  private readonly dir: string;

  constructor(cwd: string = process.cwd()) {
    this.dir = join(cwd, ".founder-os", "research");
    this.ensureDir();
  }

  private ensureDir(): void {
    try {
      mkdirSync(this.dir, { recursive: true });
    } catch {
      // Directory already exists or insufficient permissions — ignore
    }
  }

  save(session: ResearchSession, analysis: AnalysisResult | null = null): void {
    const record: PersistedResearchRecord = {
      session,
      analysis,
      persistedAt: new Date().toISOString(),
    };
    const path = join(this.dir, `${session.sessionId}.json`);
    writeFileSync(path, JSON.stringify(record, null, 2), "utf8");
  }

  load(sessionId: string): PersistedResearchRecord | undefined {
    const path = join(this.dir, `${sessionId}.json`);
    if (!existsSync(path)) return undefined;
    try {
      const raw = readFileSync(path, "utf8");
      return JSON.parse(raw) as PersistedResearchRecord;
    } catch {
      return undefined;
    }
  }

  loadAll(): PersistedResearchRecord[] {
    if (!existsSync(this.dir)) return [];
    try {
      const files = readdirSync(this.dir).filter((f) => f.endsWith(".json"));
      const records: PersistedResearchRecord[] = [];
      for (const file of files) {
        try {
          const raw = readFileSync(join(this.dir, file), "utf8");
          records.push(JSON.parse(raw) as PersistedResearchRecord);
        } catch {
          // Skip corrupt files
        }
      }
      // Newest first
      return records.sort(
        (a, b) =>
          new Date(b.session.startedAt).getTime() - new Date(a.session.startedAt).getTime(),
      );
    } catch {
      return [];
    }
  }

  /** Returns only the session portion of all persisted records, newest-first. */
  listSessions(): ResearchSession[] {
    return this.loadAll().map((r) => r.session);
  }

  /** Returns only records that have an analysis attached. */
  listAnalyzed(): PersistedResearchRecord[] {
    return this.loadAll().filter((r) => r.analysis !== null);
  }

  /** Latest persisted session, or undefined if none. */
  latest(): PersistedResearchRecord | undefined {
    return this.loadAll()[0];
  }

  /** Number of persisted sessions on disk. */
  count(): number {
    if (!existsSync(this.dir)) return 0;
    try {
      return readdirSync(this.dir).filter((f) => f.endsWith(".json")).length;
    } catch {
      return 0;
    }
  }

  /**
   * Champion opportunity — highest finalScore top opportunity across all
   * sessions that have an analysis result.
   */
  getChampion(): { record: PersistedResearchRecord; finalScore: number } | undefined {
    const analyzed = this.listAnalyzed();
    let best: { record: PersistedResearchRecord; finalScore: number } | undefined;
    for (const r of analyzed) {
      const top = r.analysis?.topOpportunity;
      if (!top) continue;
      if (!best || top.finalScore > best.finalScore) {
        best = { record: r, finalScore: top.finalScore };
      }
    }
    return best;
  }

  /**
   * Search opportunities across all sessions by keyword.
   * Returns matched ranked opportunities with their session context.
   */
  search(
    query: string,
    opts: { maxResults?: number; sessionId?: string } = {},
  ): Array<{ sessionId: string; rank: import("./analysis-types.js").RankedOpportunity }> {
    const lq = query.toLowerCase();
    const records = opts.sessionId
      ? [this.load(opts.sessionId)].filter(Boolean) as PersistedResearchRecord[]
      : this.listAnalyzed();

    const results: Array<{ sessionId: string; rank: import("./analysis-types.js").RankedOpportunity }> = [];
    for (const r of records) {
      if (!r.analysis) continue;
      for (const ranked of r.analysis.all) {
        const text = ranked.opportunity.problemSummary.toLowerCase();
        if (text.includes(lq)) {
          results.push({ sessionId: r.session.sessionId, rank: ranked });
        }
      }
    }

    const max = opts.maxResults ?? 20;
    return results.slice(0, max);
  }
}
