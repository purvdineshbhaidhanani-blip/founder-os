import React from "react";
import type { ConnectorStatusView } from "../api/types";

/** Renders a per-source connector badge: "configured" or "missing: X, Y". */
export default function SourceStatusBadge({ connector }: { connector: ConnectorStatusView }): React.ReactElement {
  const isConfigured = connector.status === "configured";
  const label = isConfigured
    ? "configured"
    : connector.missingEnv.length > 0
      ? `missing: ${connector.missingEnv.join(", ")}`
      : connector.status;

  return (
    <span className={`badge ${isConfigured ? "badge-ok" : "badge-warn"}`} title={connector.name}>
      <strong>{connector.name}</strong>
      <span className="badge-detail">{label}</span>
    </span>
  );
}
