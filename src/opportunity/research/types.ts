import type { Timestamp } from "../../types/common.js";
import type { CollectorSource } from "../types.js";

// ---------------------------------------------------------------------------
// Research Period
// ---------------------------------------------------------------------------

export type ResearchPeriodPreset = "7d" | "30d" | "90d";

export interface ResearchPeriod {
  since: string;   // ISO timestamp — inclusive start
  until: string;   // ISO timestamp — inclusive end (usually now)
  label: string;   // human label e.g. "Last 30 Days"
}

export function researchPeriodFromPreset(preset: ResearchPeriodPreset): ResearchPeriod {
  const now = new Date();
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  return { since, until: now.toISOString(), label: `Last ${days} Days` };
}

export function researchPeriodCustom(since: string, until?: string): ResearchPeriod {
  const end = until ?? new Date().toISOString();
  const days = Math.round((new Date(end).getTime() - new Date(since).getTime()) / (1000 * 60 * 60 * 24));
  return { since, until: end, label: `Custom ${days}d range` };
}

// ---------------------------------------------------------------------------
// Source Statistics
// ---------------------------------------------------------------------------

export interface SourceStats {
  source: CollectorSource;
  itemsCollected: number;
  itemsDeduplicated: number;
  signalsExtracted: number;
  errors: Array<{ code: string; message: string }>;
  durationMs: number;
  credentialed: boolean;   // true = ran with API key/token
}

// ---------------------------------------------------------------------------
// Research Session
// ---------------------------------------------------------------------------

export type ResearchSessionStatus = "running" | "completed" | "partial" | "failed";

export interface ResearchSession {
  sessionId: string;
  period: ResearchPeriod;
  startedAt: Timestamp;
  completedAt: Timestamp | null;
  status: ResearchSessionStatus;

  // Collection summary
  totalItemsCollected: number;
  totalItemsAfterDedup: number;
  totalSignalsExtracted: number;
  totalOpportunitiesUpserted: number;
  durationMs: number;

  // Per-source breakdown
  sourceStats: SourceStats[];
  successfulSources: CollectorSource[];
  failedSources: CollectorSource[];

  // Errors
  errors: string[];
}

// ---------------------------------------------------------------------------
// Credentials snapshot (never serialized to disk — ephemeral)
// ---------------------------------------------------------------------------

export interface ResearchCredentials {
  githubToken: string | undefined;
  youtubeApiKey: string | undefined;
  stackexchangeApiKey: string | undefined;
  missingKeys: string[];
}
