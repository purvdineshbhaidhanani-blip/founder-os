import React, { useState } from "react";
import type { FounderCopilotAnswer } from "../api/types";
import { answerToClipboardText, isUnmatched } from "../lib/copilot-format";
import CitationList from "./CitationList";

/**
 * Renders one copilot answer with its topic/NOT-VERIFIED badges, a copy
 * button, and collapsible citations. Reused by both the conversation
 * transcript and the "all insights" battery so answer rendering lives in
 * exactly one place.
 */
function CopilotAnswerCard({ answer }: { answer: FounderCopilotAnswer }): React.ReactElement {
  const [copied, setCopied] = useState(false);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(answerToClipboardText(answer));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (insecure context) — no-op rather than crash.
    }
  };

  return (
    <div className="copilot-answer">
      <p>{answer.answer}</p>
      <div className="copilot-answer-meta">
        <span className="badge">{answer.topic}</span>
        {answer.notVerified && <span className="badge badge-warn">Contains NOT VERIFIED fields</span>}
        {isUnmatched(answer) && <span className="badge badge-warn">No topic match</span>}
        <button type="button" className="copilot-copy" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy answer"}
        </button>
      </div>
      <CitationList citations={answer.citations} />
    </div>
  );
}

export default React.memo(CopilotAnswerCard);
