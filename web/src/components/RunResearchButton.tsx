import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { isMissingKeysError, runResearch } from "../api/client";
import MissingKeyBanner from "./MissingKeyBanner";

/**
 * Shared "run research" action used by both Dashboard (fixed 30-day window)
 * and Research (user-supplied window). On success, navigates to the live
 * progress page for the streaming sessionId returned by POST
 * /api/research/run. On a 422 MissingKeysError, renders the exact missing
 * env var names instead of navigating.
 */
export default function RunResearchButton({
  windowDays,
  label,
}: {
  windowDays: number;
  label: string;
}): React.ReactElement {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [missingKeysError, setMissingKeysError] = useState<{ message: string; missing: string[] } | null>(null);

  const handleClick = async (): Promise<void> => {
    setSubmitting(true);
    setMissingKeysError(null);
    try {
      const { sessionId } = await runResearch(windowDays);
      navigate(`/research/progress/${encodeURIComponent(sessionId)}`);
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
    <div className="run-research-action">
      <button type="button" onClick={() => void handleClick()} disabled={submitting}>
        {submitting ? "Starting..." : label}
      </button>
      {missingKeysError && (
        <MissingKeyBanner message={missingKeysError.message} missing={missingKeysError.missing} />
      )}
    </div>
  );
}
