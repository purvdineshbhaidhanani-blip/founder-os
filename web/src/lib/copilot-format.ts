import type { FounderCopilotAnswer, FounderCopilotCitation } from "../api/types";

/**
 * Pure, DOM-free helpers for the Founder Copilot UI — unit-testable in the
 * node harness. No reasoning: only presentation shaping over answers the
 * copilot API already returns.
 */

/** One entry in the per-opportunity conversation transcript. */
export interface ConversationEntry {
  id: string;
  question: string;
  status: "loading" | "answered" | "error";
  answer?: FounderCopilotAnswer;
  error?: string;
}

/** Renders a citation as a single copy-friendly line. */
export function formatCitation(citation: FounderCopilotCitation): string {
  return `${citation.fieldPath}: ${citation.value}`;
}

/** Builds the plain-text a "Copy answer" button puts on the clipboard, question + answer + citations. */
export function answerToClipboardText(answer: FounderCopilotAnswer): string {
  const lines = [`Q: ${answer.question}`, `A: ${answer.answer}`];
  if (answer.citations.length > 0) {
    lines.push("", "Sources:");
    for (const citation of answer.citations) lines.push(`- ${formatCitation(citation)}`);
  }
  if (answer.notVerified) lines.push("", "Note: at least one cited field is NOT VERIFIED.");
  return lines.join("\n");
}

/** True when a question produced no real match (honest fallback topic). */
export function isUnmatched(answer: FounderCopilotAnswer): boolean {
  return answer.topic === "unmatched";
}
