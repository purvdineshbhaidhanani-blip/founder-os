import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { CollectorSource } from "../types.js";
import type { ResearchPeriodPreset } from "./types.js";

// ---------------------------------------------------------------------------
// Research Configuration — persisted to .founder-os/config.json
// Stores founder's preferred research settings across sessions.
// ---------------------------------------------------------------------------

export const ALL_SOURCES: CollectorSource[] = [
  "github-issues",
  "github-discussions",
  "hacker-news",
  "stackoverflow",
  "youtube",
  "professional-blogs",
];

export interface ResearchConfig {
  period: ResearchPeriodPreset;
  customSince?: string;
  customUntil?: string;
  enabledSources: CollectorSource[];
  limitPerSource: number;
  savedAt: string;
}

const DEFAULTS: Omit<ResearchConfig, "savedAt"> = {
  period: "30d",
  enabledSources: [...ALL_SOURCES],
  limitPerSource: 30,
};

export class ResearchConfigManager {
  private readonly path: string;
  private readonly dir: string;

  constructor(cwd: string = process.cwd()) {
    this.dir = join(cwd, ".founder-os");
    this.path = join(this.dir, "config.json");
  }

  load(): ResearchConfig {
    if (!existsSync(this.path)) return this.defaults();
    try {
      return JSON.parse(readFileSync(this.path, "utf8")) as ResearchConfig;
    } catch {
      return this.defaults();
    }
  }

  save(updates: Partial<Omit<ResearchConfig, "savedAt">>): ResearchConfig {
    const current = this.load();
    const next: ResearchConfig = {
      ...current,
      ...updates,
      savedAt: new Date().toISOString(),
    };
    this.ensureDir();
    writeFileSync(this.path, JSON.stringify(next, null, 2), "utf8");
    return next;
  }

  reset(): ResearchConfig {
    return this.save(DEFAULTS);
  }

  private defaults(): ResearchConfig {
    return { ...DEFAULTS, savedAt: new Date().toISOString() };
  }

  private ensureDir(): void {
    try {
      mkdirSync(this.dir, { recursive: true });
    } catch {
      // ignore
    }
  }
}
