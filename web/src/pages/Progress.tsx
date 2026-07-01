import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { subscribeProgress } from "../api/client";
import type { ResearchProgressEvent } from "../api/types";
import ProgressBar from "../components/ProgressBar";

interface SourceState {
  sourceId: string;
  status: "running" | "done" | "failed";
  itemCount?: number;
  error?: string;
}

export default function Progress(): React.ReactElement {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [sources, setSources] = useState<Record<string, SourceState>>({});
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState("Connecting...");
  const [fatalError, setFatalError] = useState<string | null>(null);
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (!sessionId) return undefined;
    navigatedRef.current = false;

    const unsubscribe = subscribeProgress(sessionId, (event: ResearchProgressEvent) => {
      switch (event.type) {
        case "source.start":
          setSources((prev) => ({ ...prev, [event.sourceId]: { sourceId: event.sourceId, status: "running" } }));
          break;
        case "source.done":
          setSources((prev) => ({
            ...prev,
            [event.sourceId]: { sourceId: event.sourceId, status: "done", itemCount: event.itemCount },
          }));
          break;
        case "source.failed":
          setSources((prev) => ({
            ...prev,
            [event.sourceId]: { sourceId: event.sourceId, status: "failed", error: event.error },
          }));
          break;
        case "progress":
          setPercent(event.percent);
          setMessage(event.message);
          break;
        case "complete":
          setPercent(100);
          setMessage("Complete");
          if (!navigatedRef.current) {
            navigatedRef.current = true;
            navigate(`/research/report/${encodeURIComponent(event.session.id)}`, { replace: true });
          }
          break;
        case "error":
          setFatalError(event.message);
          break;
        default:
          break;
      }
    });

    return unsubscribe;
  }, [sessionId, navigate]);

  const sourceList = Object.values(sources);

  return (
    <div className="page">
      <h1>Research in Progress</h1>
      <p className="page-subtitle">Session: {sessionId}</p>

      {fatalError && <div className="banner banner-error">{fatalError}</div>}

      <section className="card">
        <ProgressBar percent={percent} />
        <p className="muted">{message}</p>
      </section>

      <section className="card">
        <h2>Sources</h2>
        {sourceList.length === 0 ? (
          <p className="muted">Waiting for the first source to start...</p>
        ) : (
          <ul className="source-progress-list">
            {sourceList.map((source) => (
              <li key={source.sourceId} className={`source-status-${source.status}`}>
                <strong>{source.sourceId}</strong>
                {source.status === "running" && " — running..."}
                {source.status === "done" && ` — done (${source.itemCount} items)`}
                {source.status === "failed" && ` — failed: ${source.error}`}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
