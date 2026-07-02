import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { subscribePipelineProgress } from "../api/client";
import type { PipelineProgressEvent, PipelineStage } from "../api/types";
import ProgressBar from "../components/ProgressBar";

interface SourceState {
  sourceId: string;
  status: "running" | "done" | "failed";
  itemCount?: number;
  error?: string;
}

const STAGE_LABELS: Record<PipelineStage, string> = {
  research: "1/3 Researching",
  problems: "2/3 Clustering Problems",
  opportunities: "3/3 Scoring Opportunities",
  complete: "Complete",
};

/**
 * Single progress view for the whole one-button pipeline
 * (research -> problem clustering -> opportunity scoring), subscribing to
 * the pipeline's SSE stream. Navigates to the Top Opportunities page once
 * the server's final `{stage: "complete", type: "complete"}` event arrives.
 */
export default function PipelineProgress(): React.ReactElement {
  const { pipelineId } = useParams<{ pipelineId: string }>();
  const navigate = useNavigate();
  const [stage, setStage] = useState<PipelineStage>("research");
  const [sources, setSources] = useState<Record<string, SourceState>>({});
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState("Connecting...");
  const [fatalError, setFatalError] = useState<{ message: string; missing?: string[] } | null>(null);
  const navigatedRef = useRef(false);

  useEffect(() => {
    if (!pipelineId) return undefined;
    navigatedRef.current = false;

    const unsubscribe = subscribePipelineProgress(pipelineId, (event: PipelineProgressEvent) => {
      switch (event.type) {
        case "source.start":
          setStage("research");
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
          setStage(event.stage);
          setPercent(event.percent);
          setMessage(event.message);
          break;
        case "complete":
          if (event.stage === "complete") {
            setStage("complete");
            setPercent(100);
            setMessage("Complete");
            if (!navigatedRef.current) {
              navigatedRef.current = true;
              navigate(`/pipeline/${encodeURIComponent(event.pipelineId)}/opportunities`, { replace: true });
            }
          } else {
            // The research stage's own "complete" event — the pipeline moves
            // on to the problems stage next, so just note research finished.
            setMessage("Research complete — clustering problems next...");
          }
          break;
        case "error":
          setFatalError({ message: event.message, missing: event.missing });
          break;
        default:
          break;
      }
    });

    return unsubscribe;
  }, [pipelineId, navigate]);

  const sourceList = Object.values(sources);

  return (
    <div className="page">
      <h1>Founder Intelligence OS</h1>
      <p className="page-subtitle">Pipeline: {pipelineId}</p>

      {fatalError && (
        <div className="banner banner-error">
          <p>{fatalError.message}</p>
          {fatalError.missing && fatalError.missing.length > 0 && (
            <ul>
              {fatalError.missing.map((key) => (
                <li key={key}>
                  <code>{key}</code>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <section className="card">
        <h2>{STAGE_LABELS[stage]}</h2>
        <ProgressBar percent={percent} />
        <p className="muted">{message}</p>
      </section>

      {stage === "research" && (
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
      )}
    </div>
  );
}
