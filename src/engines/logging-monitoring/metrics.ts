import type { MetricKind, MetricSample } from "./types.js";

export interface MetricsCollector {
  increment(name: string, value?: number, tags?: Record<string, string>): void;
  gauge(name: string, value: number, tags?: Record<string, string>): void;
  histogram(name: string, value: number, tags?: Record<string, string>): void;
  samples(): MetricSample[];
}

/** In-process metrics buffer. Export `samples()` to whatever metrics backend (Prometheus, Datadog, ...) you use. */
export class InMemoryMetricsCollector implements MetricsCollector {
  private readonly buffer: MetricSample[] = [];

  private record(kind: MetricKind, name: string, value: number, tags?: Record<string, string>): void {
    this.buffer.push({ name, kind, value, tags, timestamp: new Date().toISOString() });
  }

  increment(name: string, value = 1, tags?: Record<string, string>): void {
    this.record("counter", name, value, tags);
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.record("gauge", name, value, tags);
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.record("histogram", name, value, tags);
  }

  samples(): MetricSample[] {
    return [...this.buffer];
  }
}
