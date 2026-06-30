import type { Timestamp } from "../types/common.js";

/**
 * The Reality Guard envelope. Every market-intelligence finding MUST flow as
 * an Insight<T>: a typed payload wrapped in evidence, sources, confidence,
 * assumptions and unknowns. The guard (reality-guard.ts) verifies the envelope
 * before downstream agents are allowed to act on it, so the system never
 * "invents certainty."
 */

export type Confidence = "low" | "medium" | "high";

export type SourceKind = "primary" | "secondary" | "anecdote" | "synthesis";

export interface Source {
  url?: string;
  title: string;
  kind: SourceKind;
  fetchedAt: Timestamp;
  snippet?: string;
}

export interface Evidence {
  claim: string;
  supportingSources: Source[];
  strength: Confidence;
}

export interface Insight<T = unknown> {
  id: string;
  topic: string;
  finding: T;
  evidence: Evidence[];
  confidence: Confidence;
  sources: Source[];
  assumptions: string[];
  unknowns: string[];
  reportedBy: string;
  reportedAt: Timestamp;
  tags?: string[];
}

export interface ConflictReport {
  topic: string;
  conflictingInsights: string[];
  description: string;
}
