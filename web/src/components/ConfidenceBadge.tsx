import React from "react";

interface ConfidenceScore {
  band: "low" | "medium" | "high";
  numericScore: number;
}

export default function ConfidenceBadge({ score }: { score: ConfidenceScore }): React.ReactElement {
  return (
    <span className={`badge confidence-${score.band}`}>
      Confidence: {score.numericScore.toFixed(2)} ({score.band})
    </span>
  );
}
