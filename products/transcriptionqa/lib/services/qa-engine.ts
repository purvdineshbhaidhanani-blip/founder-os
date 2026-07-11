export type FindingCategory = "terminology" | "speaker_attribution";
export type FindingSeverity = "low" | "medium" | "high" | "critical";
export type Domain = "medical" | "legal";

export interface SegmentCandidate {
  id: string;
  sequenceIndex: number;
  speakerLabel: string;
  text: string;
}

export interface QaFindingCandidate {
  segmentId: string;
  ruleId: string;
  category: FindingCategory;
  severity: FindingSeverity;
  title: string;
  description: string;
  suggestedCorrection: string | null;
}

interface TerminologyRule {
  domain: Domain;
  wrong: string;
  correct: string;
  reason: string;
}

/**
 * Small, illustrative domain terminology confusion-pair library
 * standing in for the medical/legal dictionaries described in
 * docs/PRODUCT_IDENTITY.md §7 "Flag medical/legal terminology
 * mistakes" and §21's "Medical & Legal Dictionary" entitlement. A
 * production dictionary would be built and validated against real,
 * anonymized transcripts with design-partner review per §27's risk
 * mitigation — this is the Phase 1 seed set.
 */
const TERMINOLOGY_RULES: TerminologyRule[] = [
  { domain: "medical", wrong: "hyper tension", correct: "hypertension", reason: "commonly split by ASR into two words; the medical term is one word." },
  { domain: "medical", wrong: "metaformin", correct: "metformin", reason: "likely ASR mishearing of the diabetes medication metformin." },
  { domain: "medical", wrong: "zantac", correct: "xanax", reason: "these two drug names are commonly confused by ASR — verify against clinical context." },
  { domain: "legal", wrong: "disposition", correct: "deposition", reason: "these two legal terms are commonly confused by ASR — verify against context." },
  { domain: "legal", wrong: "torte", correct: "tort", reason: "likely ASR mishearing of the legal term tort (a civil wrong), not the pastry." },
  { domain: "legal", wrong: "prostate", correct: "probate", reason: "these two terms are commonly confused by ASR — verify against context." },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Domain terminology validation per docs/PRODUCT_IDENTITY.md §7 "Flag medical/legal terminology mistakes." */
export function validateTerminology(segments: SegmentCandidate[]): QaFindingCandidate[] {
  const findings: QaFindingCandidate[] = [];
  for (const segment of segments) {
    for (const rule of TERMINOLOGY_RULES) {
      const pattern = new RegExp(`\\b${escapeRegExp(rule.wrong)}\\b`, "i");
      if (pattern.test(segment.text)) {
        findings.push({
          segmentId: segment.id,
          ruleId: `terminology_${rule.wrong.replace(/\s+/g, "_")}`,
          category: "terminology",
          severity: "high",
          title: `Possible ${rule.domain} terminology error: "${rule.wrong}"`,
          description: `This segment contains "${rule.wrong}", which is ${rule.reason} Suggested correction: "${rule.correct}".`,
          suggestedCorrection: rule.correct,
        });
      }
    }
  }
  return findings;
}

/**
 * Speaker attribution anomaly detection per docs/PRODUCT_IDENTITY.md
 * §7 "Speaker detection" and pain #5 "speaker attribution errors
 * compound confusion." Flags the classic diarization-glitch pattern:
 * a very short segment attributed to a different speaker than both
 * of its neighbors, who share the same speaker label.
 */
export function detectSpeakerAttributionAnomalies(segments: SegmentCandidate[]): QaFindingCandidate[] {
  const ordered = [...segments].sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  const findings: QaFindingCandidate[] = [];

  for (let i = 1; i < ordered.length - 1; i++) {
    const previous = ordered[i - 1]!;
    const current = ordered[i]!;
    const next = ordered[i + 1]!;
    const wordCount = current.text.trim().split(/\s+/).filter(Boolean).length;

    if (previous.speakerLabel === next.speakerLabel && current.speakerLabel !== previous.speakerLabel && wordCount <= 3) {
      findings.push({
        segmentId: current.id,
        ruleId: "speaker_attribution_anomaly",
        category: "speaker_attribution",
        severity: "medium",
        title: "Likely speaker misattribution",
        description: `This short segment ("${current.text.trim()}") is attributed to "${current.speakerLabel}", but both the segment before and after it are attributed to "${previous.speakerLabel}" — a common diarization glitch pattern. Verify who actually said this.`,
        suggestedCorrection: previous.speakerLabel,
      });
    }
  }

  return findings;
}

const SEVERITY_WEIGHT: Record<FindingSeverity, number> = { critical: 25, high: 12, medium: 5, low: 1 };

/** Accuracy score per the same severity-weighted formula used across this portfolio's audit products: starts at 100, deducts a severity-weighted penalty per finding, floors at 0. */
export function computeAccuracyScore(findings: { severity: string }[]): number {
  const penalty = findings.reduce((total, finding) => total + (SEVERITY_WEIGHT[finding.severity as FindingSeverity] ?? 0), 0);
  return Math.max(0, 100 - penalty);
}
