import React from "react";
import type { FounderCopilotCitation } from "../api/types";

/**
 * Renders a copilot answer's field-level provenance. Every citation traces to
 * a real field on the opportunity report (fieldPath + its stringified value);
 * this component only displays them — it invents nothing.
 */
export default function CitationList({ citations }: { citations: FounderCopilotCitation[] }): React.ReactElement | null {
  if (citations.length === 0) return null;
  return (
    <details className="copilot-citations">
      <summary>{citations.length} source field(s)</summary>
      <ul>
        {citations.map((citation, index) => (
          <li key={`${citation.fieldPath}-${index}`}>
            <code>{citation.fieldPath}</code>
            <span className="muted"> — {citation.value}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
