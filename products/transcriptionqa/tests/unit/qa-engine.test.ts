import { describe, expect, it } from "vitest";
import { computeAccuracyScore, detectSpeakerAttributionAnomalies, validateTerminology, type SegmentCandidate } from "../../lib/services/qa-engine.js";

describe("validateTerminology", () => {
  it("flags a known medical terminology confusion with a suggested correction", () => {
    const segments: SegmentCandidate[] = [{ id: "s1", sequenceIndex: 0, speakerLabel: "Dr. Lee", text: "The patient has a history of hyper tension and diabetes." }];
    const findings = validateTerminology(segments);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.suggestedCorrection).toBe("hypertension");
  });

  it("flags a known legal terminology confusion with a suggested correction", () => {
    const segments: SegmentCandidate[] = [{ id: "s1", sequenceIndex: 0, speakerLabel: "Attorney", text: "We scheduled the disposition for next Tuesday." }];
    const findings = validateTerminology(segments);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.suggestedCorrection).toBe("deposition");
  });

  it("produces no findings for clean text with no confusable terms", () => {
    const segments: SegmentCandidate[] = [{ id: "s1", sequenceIndex: 0, speakerLabel: "Speaker 1", text: "Thanks for joining the call today, let's get started." }];
    expect(validateTerminology(segments)).toHaveLength(0);
  });

  it("matches case-insensitively and on word boundaries only", () => {
    const segments: SegmentCandidate[] = [{ id: "s1", sequenceIndex: 0, speakerLabel: "Speaker 1", text: "ZANTAC was mentioned, but also metaformination is not a real word." }];
    const findings = validateTerminology(segments);
    // "zantac" matches; "metaformin" must not match inside "metaformination" due to word boundary.
    expect(findings.some((f) => f.suggestedCorrection === "xanax")).toBe(true);
    expect(findings.some((f) => f.suggestedCorrection === "metformin")).toBe(false);
  });
});

describe("detectSpeakerAttributionAnomalies", () => {
  it("flags a short segment sandwiched between two segments from a different, shared speaker", () => {
    const segments: SegmentCandidate[] = [
      { id: "s1", sequenceIndex: 0, speakerLabel: "Speaker A", text: "So walk me through what happened next." },
      { id: "s2", sequenceIndex: 1, speakerLabel: "Speaker B", text: "Right." },
      { id: "s3", sequenceIndex: 2, speakerLabel: "Speaker A", text: "And then what did you do after that?" },
    ];
    const findings = detectSpeakerAttributionAnomalies(segments);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.segmentId).toBe("s2");
    expect(findings[0]!.suggestedCorrection).toBe("Speaker A");
  });

  it("does not flag normal turn-taking between two speakers", () => {
    const segments: SegmentCandidate[] = [
      { id: "s1", sequenceIndex: 0, speakerLabel: "Speaker A", text: "How are you feeling today?" },
      { id: "s2", sequenceIndex: 1, speakerLabel: "Speaker B", text: "I've been having some chest pain since yesterday." },
      { id: "s3", sequenceIndex: 2, speakerLabel: "Speaker A", text: "Can you describe the pain in more detail?" },
    ];
    expect(detectSpeakerAttributionAnomalies(segments)).toHaveLength(0);
  });

  it("does not flag a longer interjection even if speaker pattern matches", () => {
    const segments: SegmentCandidate[] = [
      { id: "s1", sequenceIndex: 0, speakerLabel: "Speaker A", text: "So walk me through what happened next." },
      { id: "s2", sequenceIndex: 1, speakerLabel: "Speaker B", text: "Well, it's actually a longer story than you might expect." },
      { id: "s3", sequenceIndex: 2, speakerLabel: "Speaker A", text: "And then what did you do after that?" },
    ];
    expect(detectSpeakerAttributionAnomalies(segments)).toHaveLength(0);
  });
});

describe("computeAccuracyScore", () => {
  it("deducts a severity-weighted penalty per finding and floors at 0", () => {
    expect(computeAccuracyScore([])).toBe(100);
    expect(computeAccuracyScore([{ severity: "high" }])).toBe(88);
    expect(computeAccuracyScore([{ severity: "critical" }, { severity: "critical" }, { severity: "critical" }, { severity: "critical" }, { severity: "critical" }])).toBe(0);
  });
});
