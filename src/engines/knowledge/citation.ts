import type { Citation } from "./types.js";

/** Renders a citation as a short human-readable reference, e.g. for footnotes in an AI answer. */
export function formatCitation(citation: Citation, index?: number): string {
  const prefix = index !== undefined ? `[${index}] ` : "";
  const source = citation.sourceUrl ? ` (${citation.sourceUrl})` : "";
  return `${prefix}${citation.documentTitle}${source}: "${citation.snippet}"`;
}

/** Renders a numbered citation list, suitable for appending to an LLM answer. */
export function formatCitationList(citations: Citation[]): string {
  return citations.map((citation, i) => formatCitation(citation, i + 1)).join("\n");
}
