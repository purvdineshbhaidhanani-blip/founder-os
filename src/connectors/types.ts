import type { Timestamp } from "../types/common.js";

export type ConnectorStatus = "configured" | "missing-credentials" | "error" | "disabled";

export type ConnectorCategory =
  | "vcs" | "ci" | "infra" | "payments" | "comms" | "data" | "browser" | "mcp" | "other";

export interface ConnectorDefinition {
  id: string;
  name: string;
  vendor: string;
  category: ConnectorCategory;
  requiredEnv: string[];
  optionalEnv: string[];
  description: string;
  /** OAuth scopes / token kinds the connector will need at install time. */
  authNotes?: string;
}

export interface ConnectorRecord extends ConnectorDefinition {
  status: ConnectorStatus;
  lastChecked?: Timestamp;
  notes?: string;
}
