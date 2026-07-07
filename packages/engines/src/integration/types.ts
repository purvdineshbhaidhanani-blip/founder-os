export interface AuthStrategy {
  readonly type: "oauth2" | "api-key" | "none";
  /** Mutates/returns headers and query params to attach to an outbound request. */
  applyAuth(request: { headers: Record<string, string>; query: Record<string, string> }): Promise<void> | void;
}

export interface ConnectorConfig {
  id: string;
  baseUrl: string;
  auth: AuthStrategy;
}

export interface SyncJobResult {
  connectorId: string;
  startedAt: string;
  completedAt: string;
  status: "succeeded" | "failed";
  itemsSynced: number;
  error?: string;
  cursor?: string;
}
