import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { askCopilot, getCopilotAnswers, getCopilotQuestions, ApiError } from "../api/client";
import type { FounderCopilotAnswer } from "../api/types";
import { type ConversationEntry } from "../lib/copilot-format";
import CopilotAnswerCard from "./CopilotAnswerCard";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.body.error || err.message;
  return err instanceof Error ? err.message : "Request failed.";
}

/**
 * Founder Copilot panel — a read-only conversational surface over ONE
 * opportunity. Consumes only the copilot server routes (GET
 * /api/copilot/questions, POST .../copilot/ask, GET .../copilot/answers); it
 * holds no reasoning of its own. Conversation history is per-opportunity
 * component state (cleared when the opportunity changes). Mobile-first.
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
  const counter = useRef(0);

  // "All insights" battery state.
  const [battery, setBattery] = useState<FounderCopilotAnswer[] | null>(null);
  const [batteryLoading, setBatteryLoading] = useState(false);
  const [batteryError, setBatteryError] = useState<string | null>(null);
  const [batteryOpen, setBatteryOpen] = useState(false);
  const [batterySearch, setBatterySearch] = useState("");

  // Reset all per-opportunity state whenever the opportunity changes.
  useEffect(() => {
    setHistory([]);
    setInput("");
    setBattery(null);
    setBatteryOpen(false);
    setBatterySearch("");
  }, [pipelineId, opportunityId]);

  const loadQuestions = useCallback(() => {
    setQuestionsError(null);
    getCopilotQuestions()
      .then((res) => setSuggested([...res.canonical, ...res.additional]))
      .catch((err) => setQuestionsError(errorMessage(err)));
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
          prev.map((entry) => (entry.id === entryId ? { ...entry, status: "answered", answer: res.answer } : entry)),
        );
      } catch (err) {
        setHistory((prev) =>
          prev.map((entry) => (entry.id === entryId ? { ...entry, status: "error", error: errorMessage(err) } : entry)),
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

  const toggleBattery = useCallback(() => {
    setBatteryOpen((open) => !open);
    // Lazy-load: only fetch the full battery the first time it's opened.
    if (battery === null && !batteryLoading) {
      setBatteryLoading(true);
      setBatteryError(null);
      getCopilotAnswers(pipelineId, opportunityId)
        .then((res) => setBattery(res.answers))
        .catch((err) => setBatteryError(errorMessage(err)))
        .finally(() => setBatteryLoading(false));
    }
  }, [battery, batteryLoading, pipelineId, opportunityId]);

  const filteredBattery = useMemo(() => {
    if (!battery) return [];
    const term = batterySearch.trim().toLowerCase();
    if (!term) return battery;
    return battery.filter(
      (answer) => answer.question.toLowerCase().includes(term) || answer.answer.toLowerCase().includes(term),
    );
  }, [battery, batterySearch]);

  return (
    <section className="card copilot-panel">
      <h2>Founder Copilot</h2>
      <p className="muted">
        Ask about this opportunity. Answers are composed only from this report&apos;s own fields — every claim is cited,
        and unverified fields are flagged.
      </p>

      {questionsError ? (
        <div className="banner banner-error copilot-inline-error" role="alert">
          {questionsError}{" "}
          <button type="button" onClick={loadQuestions}>
            Retry
          </button>
        </div>
      ) : suggested.length > 0 ? (
        <div className="copilot-suggestions">
          {suggested.map((question) => (
            <button key={question} type="button" className="badge copilot-chip" onClick={() => void ask(question)}>
              {question}
            </button>
          ))}
        </div>
      ) : (
        <p className="muted" aria-live="polite">
          Loading suggested questions…
        </p>
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
        <button type="button" className="copilot-secondary" onClick={toggleBattery} aria-expanded={batteryOpen}>
          {batteryOpen ? "Hide all insights" : "Show all insights"}
        </button>
      </form>

      {batteryOpen && (
        <div className="copilot-battery">
          {batteryLoading && (
            <p className="muted" aria-live="polite">
              Loading all insights…
            </p>
          )}
          {batteryError && (
            <div className="banner banner-error copilot-inline-error" role="alert">
              {batteryError}{" "}
              <button
                type="button"
                onClick={() => {
                  setBattery(null);
                  toggleBattery();
                  toggleBattery();
                }}
              >
                Retry
              </button>
            </div>
          )}
          {battery && (
            <>
              <input
                type="search"
                className="copilot-input"
                placeholder="Search insights…"
                value={batterySearch}
                onChange={(event) => setBatterySearch(event.target.value)}
                aria-label="Search all insights"
              />
              {filteredBattery.length === 0 ? (
                <p className="muted">No insights match &ldquo;{batterySearch}&rdquo;.</p>
              ) : (
                <ul className="copilot-battery-list">
                  {filteredBattery.map((answer, index) => (
                    <li key={`${answer.topic}-${index}`}>
                      <details>
                        <summary>{answer.question}</summary>
                        <CopilotAnswerCard answer={answer} />
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      {history.length === 0 ? (
        <p className="muted copilot-empty">No questions yet — pick a suggestion above or type your own.</p>
      ) : (
        <ol className="copilot-transcript">
          {history.map((entry) => (
            <li key={entry.id} className="copilot-entry">
              <p className="copilot-question">
                <strong>Q:</strong> {entry.question}
              </p>
              {entry.status === "loading" && (
                <p className="muted copilot-loading" aria-live="polite">
                  Thinking…
                </p>
              )}
              {entry.status === "error" && (
                <div className="banner banner-error copilot-inline-error" role="alert">
                  {entry.error}{" "}
                  <button type="button" onClick={() => retry(entry.id, entry.question)}>
                    Retry
                  </button>
                </div>
              )}
              {entry.status === "answered" && entry.answer && <CopilotAnswerCard answer={entry.answer} />}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
