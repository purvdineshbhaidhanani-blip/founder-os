import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { CollectedItem, CollectorSource } from "../types.js";
import type { ResearchPeriod } from "./types.js";

// ---------------------------------------------------------------------------
// Research Checkpoint
// Saves progress after each source completes so a failed run can be resumed
// without re-collecting already-finished sources.
// Stored at .founder-os/checkpoints/<sessionId>.json
// ---------------------------------------------------------------------------

export interface ResearchCheckpoint {
  sessionId: string;
  period: ResearchPeriod;
  limitPerSource: number;
  completedSources: CollectorSource[];
  collectedItems: CollectedItem[];
  failedSources: CollectorSource[];
  savedAt: string;
}

export class CheckpointManager {
  private readonly dir: string;

  constructor(cwd: string = process.cwd()) {
    this.dir = join(cwd, ".founder-os", "checkpoints");
  }

  save(checkpoint: ResearchCheckpoint): void {
    this.ensureDir();
    const path = join(this.dir, `${checkpoint.sessionId}.json`);
    writeFileSync(path, JSON.stringify(checkpoint, null, 2), "utf8");
  }

  load(sessionId: string): ResearchCheckpoint | undefined {
    const path = join(this.dir, `${sessionId}.json`);
    if (!existsSync(path)) return undefined;
    try {
      return JSON.parse(readFileSync(path, "utf8")) as ResearchCheckpoint;
    } catch {
      return undefined;
    }
  }

  /** Remove checkpoint after successful session completion. */
  clear(sessionId: string): void {
    const path = join(this.dir, `${sessionId}.json`);
    try {
      if (existsSync(path)) unlinkSync(path);
    } catch {
      // non-fatal
    }
  }

  exists(sessionId: string): boolean {
    return existsSync(join(this.dir, `${sessionId}.json`));
  }

  private ensureDir(): void {
    try {
      mkdirSync(this.dir, { recursive: true });
    } catch {
      // ignore
    }
  }
}
