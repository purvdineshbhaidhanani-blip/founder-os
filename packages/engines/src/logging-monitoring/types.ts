export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogFields {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  scope: string;
  message: string;
  fields?: LogFields;
}

export type HealthStatus = "ok" | "degraded" | "down";

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  details?: string;
  durationMs: number;
}

export interface AggregateHealth {
  status: HealthStatus;
  checks: HealthCheckResult[];
  checkedAt: string;
}

export type MetricKind = "counter" | "gauge" | "histogram";

export interface MetricSample {
  name: string;
  kind: MetricKind;
  value: number;
  tags?: Record<string, string>;
  timestamp: string;
}

export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  timestamp: string;
}
