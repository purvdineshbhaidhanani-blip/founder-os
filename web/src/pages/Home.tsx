import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { isMissingKeysError, runPipeline } from "../api/client";
import MissingKeyBanner from "../components/MissingKeyBanner";

/**
 * The new default landing page: the "one button" founder experience. A
 * fixed 30-day research window (no dropdown, per spec) and a single START
 * RESEARCH button that kicks off the whole pipeline
 * (research -> problem clustering -> opportunity scoring) behind one
 * progress view.
 */
const WINDOW_DAYS = 30;

export default function Home(): React.ReactElement {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [missingKeysError, setMissingKeysError] = useState<{ message: string; missing: string[] } | null>(null);

  const handleStart = async (): Promise<void> => {
    setSubmitting(true);
    setMissingKeysError(null);
    try {
      const { pipelineId } = await runPipeline(WINDOW_DAYS);
      navigate(`/pipeline/${encodeURIComponent(pipelineId)}/progress`);
    } catch (error) {
      if (isMissingKeysError(error)) {
        setMissingKeysError({ message: error.body.error, missing: error.body.missing ?? [] });
      } else {
        setMissingKeysError({
          message: error instanceof Error ? error.message : "Failed to start research run.",
          missing: [],
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page home-page">
      <div className="home-hero card">
        <h1>Founder Intelligence OS</h1>
        <p className="page-subtitle">Research Window: Last {WINDOW_DAYS} Days</p>
        <button type="button" className="start-research-button" onClick={() => void handleStart()} disabled={submitting}>
          {submitting ? "Starting..." : "START RESEARCH"}
        </button>
        {missingKeysError && (
          <MissingKeyBanner message={missingKeysError.message} missing={missingKeysError.missing} />
        )}
      </div>
    </div>
  );
}
