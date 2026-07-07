import { describe, expect, it } from "vitest";
import { HealthCheckRegistry } from "../src/logging-monitoring/health.js";
import { JsonConsoleLogger } from "../src/logging-monitoring/logger.js";
import { InMemoryMetricsCollector } from "../src/logging-monitoring/metrics.js";
import { InMemoryErrorReporter } from "../src/logging-monitoring/error-reporting.js";
import { InMemoryTracer } from "../src/logging-monitoring/tracing.js";

describe("Logging & Monitoring Engine", () => {
  it("JsonConsoleLogger emits structured JSON lines respecting the level threshold", () => {
    const lines: string[] = [];
    const logger = new JsonConsoleLogger({ scope: "test", minLevel: "warn", sink: (_level, line) => lines.push(line) });
    logger.debug("ignored");
    logger.info("also ignored");
    logger.warn("shown", { code: 42 });
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]!);
    expect(parsed).toMatchObject({ level: "warn", scope: "test", message: "shown", code: 42 });
  });

  it("child logger inherits scope prefix and sink", () => {
    const lines: string[] = [];
    const logger = new JsonConsoleLogger({ scope: "root", sink: (_l, line) => lines.push(line) });
    logger.child("db").info("connected");
    expect(JSON.parse(lines[0]!).scope).toBe("root:db");
  });

  it("HealthCheckRegistry aggregates to the worst status", async () => {
    const registry = new HealthCheckRegistry();
    registry.register("db", async () => ({ status: "ok" }));
    registry.register("cache", async () => ({ status: "degraded", details: "slow" }));
    const result = await registry.runAll();
    expect(result.status).toBe("degraded");
    expect(result.checks).toHaveLength(2);
  });

  it("HealthCheckRegistry treats a throwing check as down", async () => {
    const registry = new HealthCheckRegistry();
    registry.register("flaky", async () => {
      throw new Error("unreachable");
    });
    const result = await registry.runAll();
    expect(result.status).toBe("down");
  });

  it("InMemoryMetricsCollector records counters, gauges, and histograms", () => {
    const metrics = new InMemoryMetricsCollector();
    metrics.increment("requests");
    metrics.gauge("queue.depth", 5);
    metrics.histogram("latency.ms", 120);
    expect(metrics.samples()).toHaveLength(3);
  });

  it("InMemoryErrorReporter buffers reports for later inspection", () => {
    const reporter = new InMemoryErrorReporter();
    reporter.report(new Error("bad"), { userId: "u1" });
    expect(reporter.all()).toHaveLength(1);
    expect(reporter.all()[0]!.context).toEqual({ userId: "u1" });
  });

  it("InMemoryTracer records span duration and tags on end", () => {
    const tracer = new InMemoryTracer();
    const span = tracer.startSpan("handle-request");
    span.setTag("route", "/health");
    span.end("ok");
    const spans = tracer.spans();
    expect(spans).toHaveLength(1);
    expect(spans[0]!.tags.route).toBe("/health");
    expect(spans[0]!.status).toBe("ok");
  });
});
