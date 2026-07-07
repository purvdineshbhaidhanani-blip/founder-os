export interface AnalyticsEvent {
  id: string;
  name: string;
  properties: Record<string, unknown>;
  userId?: string;
  timestamp: string;
}

export interface EventQuery {
  name?: string;
  userId?: string;
  since?: string;
  until?: string;
  limit?: number;
}

export interface MetricPoint {
  name: string;
  value: number;
  timestamp: string;
  tags?: Record<string, string>;
}

export interface TimeSeriesBucket {
  bucketStart: string;
  value: number;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AuditQuery {
  actor?: string;
  action?: string;
  target?: string;
  since?: string;
  until?: string;
  limit?: number;
}
