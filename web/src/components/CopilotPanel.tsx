import React, { useCallback, useEffect, useRef, useState } from "react";
import { askCopilot, getCopilotQuestions, ApiError } from "../api/client";
import type { FounderCopilotAnswer } from "../api/types";
import { answerToClipboardText, isUnmatched, type ConversationEntry } from "../lib/copilot-format";
import CitationList from "./CitationList";

/**
 * Founder Copilot panel — a read-only conversational surface over ONE
 * opportunity. Consumes only the copilot server routes (GET
 * /api/copilot/questions and POST .../copilot/ask); it holds no reasoning of
 * its own. Conversation history is per-opportunity component state (cleared
 * when the opportunity changes). Mobile-first: single column, wraps on narrow
 * viewports.
 */
export default function CopilotPanel({
  pipelineId,
  opportunityId,
}: {
  pipelineId: string;
  opportunityId: string;
}): React.ReactElement {
  const [suggested, setSuggested] = useState<string[]>([]);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<ConversationEntry[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const counter = useRef(0);

  // Reset the transcript whenever the opportunity changes.
  useEffect(() => {
    setHistory([]);
    setInput("");
  }, [pipelineId, opportunityId]);

  const loadQuestions = useCallback(() => {
    setQuestionsError(null);
    getCopilotQuestions()
      .then((res) => setSuggested([...res.canonical, ...res.additional]))
      .catch((err) => setQuestionsError(err instanceof Error ? err.message : "Failed to load suggested questions."));
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;
      const entryId = `q-${(counter.current += 1)}`;
      setHistory((prev) => [...prev, { id: entryId, question: trimmed, status: "loading" }]);

      try {
        const res = await askCopilot(pipelineId, opportunityId, trimmed);
        setHistory((prev) =>
          prev.map((entry) =>
            entry.id === entryId ? { ...entry, status: "answered", answer: res.answer } : entry,
          ),
        );
      } catch (err) {
        const message =
          err instanceof ApiError ? err.body.error || err.message : err instanceof Error ? err.message : "Request failed.";
        setHistory((prev) =>
          prev.map((entry) => (entry.id === entryId ? { ...entry, status: "error", error: message } : entry)),
        );
      }
    },
    [pipelineId, opportunityId],
  );

  const retry = useCallback(
    (entryId: string, question: string) => {
      setHistory((prev) => prev.filter((entry) => entry.id !== entryId));
      void ask(question);
    },
    [ask],
  );

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    const question = input;
    setInput("");
    void ask(question);
  };

  const copyAnswer = async (entryId: string, answer: FounderCopilotAnswer): Promise<void> => {
    try {
      await navigator.clipboard.writeText(answerToClipboardText(answer));
      setCopiedId(entryId);
      setTimeout(() => setCopiedId((current) => (current === entryId ? null : current)), 1500);
    } catch {
      // Clipboard denied (e.g. insecure context) — silently no-op rather than crashing.
    }
  };

  return (
    <section className="card copilot-panel">
      <h2>Founder Copilot</h2>
      <p className="muted">
        Ask about this opportunity. Answers are composed only from this report&apos;s own fields — every claim is cited,
        and unverified fields are flagged.
      </p>

      {questionsError ? (
        <div className="banner banner-error copilot-inline-error">
          {questionsError} <button type="button" onClick={loadQuestions}>Retry</button>
        </div>
      ) : suggested.length > 0 ? (
        <div className="copilot-suggestions">
          {suggested.map((question) => (
            <button
              key={question}
              type="button"
              className="badge copilot-chip"
              onClick={() => void ask(question)}
            >
              {question}
            </button>
          ))}
        </div>
      ) : (
        <p className="muted">Loading suggested questions…</p>
      )}

      <form className="copilot-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="copilot-input"
          placeholder="Ask a question about this opportunity…"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          aria-label="Ask the Founder Copilot a question"
        />
        <button type="submit" disabled={input.trim().length === 0}>
          Ask
        </button>
      </form>

      {history.length === 0 ? (
        <p className="muted copilot-empty">No questions yet — pick a suggestion above or type your own.</p>
      ) : (
        <ol className="copilot-transcript">
          {history.map((entry) => (
            <li key={entry.id} className="copilot-entry">
              <p className="copilot-question">
                <strong>Q:</strong> {entry.question}
              </p>
              {entry.status === "loading" && <p className="muted copilot-loading">Thinking…</p>}
              {entry.status === "error" && (
                <div className="banner banner-error copilot-inline-error">
                  {entry.error}{" "}
                  <button type="button" onClick={() => retry(entry.id, entry.question)}>
                    Retry
                  </button>
                </div>
              )}
              {entry.status === "answered" && entry.answer && (
                <div className="copilot-answer">
                  <p>{entry.answer.answer}</p>
                  <div className="copilot-answer-meta">
                    <span className="badge">{entry.answer.topic}</span>
                    {entry.answer.notVerified && <span className="badge badge-warn">Contains NOT VERIFIED fields</span>}
                    {isUnmatched(entry.answer) && <span className="badge badge-warn">No topic match</span>}
                    <button type="button" className="copilot-copy" onClick={() => void copyAnswer(entry.id, entry.answer!)}>
                      {copiedId === entry.id ? "Copied" : "Copy answer"}
                    </button>
                  </div>
                  <CitationList citations={entry.answer.citations} />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
