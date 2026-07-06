import { describe, expect, it } from "vitest";
import { answerToClipboardText, formatCitation, isUnmatched } from "../../web/src/lib/copilot-format";
import type { FounderCopilotAnswer } from "../../web/src/api/types";

function answer(overrides: Partial<FounderCopilotAnswer> = {}): FounderCopilotAnswer {
  return {
    question: "What should I build?",
    topic: "what-to-build",
    answer: "Build the CSV import feature first.",
    citations: [{ fieldPath: "mvpPlan.coreFeatures", value: "CSV import; bulk export" }],
    notVerified: false,
    ...overrides,
  };
}

describe("copilot-format", () => {
  it("formats a citation as fieldPath: value", () => {
    expect(formatCitation({ fieldPath: "fois.overall", value: "72" })).toBe("fois.overall: 72");
  });

  it("builds clipboard text with question, answer, and sources", () => {
    const text = answerToClipboardText(answer());
    expect(text).toContain("Q: What should I build?");
    expect(text).toContain("A: Build the CSV import feature first.");
    expect(text).toContain("Sources:");
    expect(text).toContain("- mvpPlan.coreFeatures: CSV import; bulk export");
  });

  it("appends a NOT VERIFIED note only when the answer is flagged", () => {
    expect(answerToClipboardText(answer({ notVerified: true }))).toContain("NOT VERIFIED");
    expect(answerToClipboardText(answer({ notVerified: false }))).not.toContain("NOT VERIFIED");
  });

  it("detects the unmatched fallback topic", () => {
    expect(isUnmatched(answer({ topic: "unmatched" }))).toBe(true);
    expect(isUnmatched(answer())).toBe(false);
  });
});
