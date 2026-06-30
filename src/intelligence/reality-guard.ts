import { generateId, nowIso } from "../utils/id.js";
import type { ConflictReport, Insight, Source } from "./types.js";

export interface RealityCheckIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
}

export interface RealityCheckReport {
  valid: boolean;
  issues: RealityCheckIssue[];
}

/**
 * Reality Guard — verifies that every Insight carries enough evidence to
 * justify its declared confidence, that sources are real, that uncertainty is
 * disclosed, and that conflicting findings are caught. Stateless; pure
 * functions over the envelope.
 */
export class RealityGuard {
  verify<T>(insight: Insight<T>): RealityCheckReport {
    const issues: RealityCheckIssue[] = [];

    if (insight.sources.length === 0 && insight.evidence.length === 0) {
      issues.push({ code: "UNSOURCED_CLAIM", severity: "error", message: "Insight has neither sources nor evidence." });
    }
    if (insight.confidence === "high" && insight.evidence.length === 0) {
      issues.push({ code: "HIGH_CONFIDENCE_WITHOUT_EVIDENCE", severity: "error", message: "high confidence requires at least one Evidence entry." });
    }
    for (const ev of insight.evidence) {
      if (ev.supportingSources.length === 0) {
        issues.push({ code: "EVIDENCE_WITHOUT_SOURCE", severity: "error", message: `evidence "${ev.claim}" has no supporting sources.` });
      }
    }
    if (insight.confidence !== "high" && insight.unknowns.length === 0) {
      issues.push({ code: "MISSING_UNKNOWNS", severity: "warning", message: "non-high-confidence insights should list unknowns." });
    }
    for (const source of insight.sources) {
      if (!source.title) issues.push({ code: "SOURCE_MISSING_TITLE", severity: "warning", message: "source has no title." });
    }
    return { valid: !issues.some((issue) => issue.severity === "error"), issues };
  }

  /** Pure: returns the insight with confidence downgraded when source diversity is poor. */
  recalibrate<T>(insight: Insight<T>): Insight<T> {
    const primary = insight.sources.filter((source) => source.kind === "primary").length;
    let confidence = insight.confidence;
    if (confidence === "high" && primary < 2) confidence = "medium";
    if (confidence === "medium" && primary === 0 && insight.sources.length < 2) confidence = "low";
    return { ...insight, confidence };
  }

  /** Drops sources with no usable identifier. Returns a cleaned source list. */
  pruneSources(sources: Source[]): Source[] {
    return sources.filter((source) => Boolean(source.title));
  }

  /** Compares two insights on the same topic; if findings disagree, returns a conflict report. */
  detectConflicts<T>(a: Insight<T>, b: Insight<T>): ConflictReport | undefined {
    if (a.topic !== b.topic) return undefined;
    const aFinding = JSON.stringify(a.finding);
    const bFinding = JSON.stringify(b.finding);
    if (aFinding === bFinding) return undefined;
    return {
      topic: a.topic,
      conflictingInsights: [a.id, b.id],
      description: `Conflicting findings on "${a.topic}" — ${aFinding} vs ${bFinding}`,
    };
  }
}

/** Helper to construct a well-formed insight envelope. */
export function makeInsight<T>(input: {
  topic: string;
  finding: T;
  reportedBy: string;
  evidence?: Insight<T>["evidence"];
  sources?: Source[];
  confidence?: Insight<T>["confidence"];
  assumptions?: string[];
  unknowns?: string[];
  tags?: string[];
}): Insight<T> {
  return {
    id: generateId("insight"),
    topic: input.topic,
    finding: input.finding,
    evidence: input.evidence ?? [],
    confidence: input.confidence ?? "low",
    sources: input.sources ?? [],
    assumptions: input.assumptions ?? [],
    unknowns: input.unknowns ?? [],
    reportedBy: input.reportedBy,
    reportedAt: nowIso(),
    tags: input.tags,
  };
}
