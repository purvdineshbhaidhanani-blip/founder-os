import { describe, expect, it, vi } from "vitest";
import { createLogger } from "../../src/logging/logger.js";
import { redact } from "../../src/logging/redact.js";
import { runWithRequestContext, getRequestContext, resolveRequestId } from "../../src/logging/request-context.js";

describe("redact", () => {
  it("redacts sensitive top-level keys", () => {
    const result = redact({ email: "a@b.com", password: "hunter2" }) as Record<string, unknown>;
    expect(result.email).toBe("a@b.com");
    expect(result.password).toBe("[REDACTED]");
  });

  it("redacts sensitive keys nested in objects and arrays", () => {
    const result = redact({
      user: { accessToken: "abc123", name: "Ada" },
      sessions: [{ tokenHash: "xyz" }],
    }) as any;
    expect(result.user.accessToken).toBe("[REDACTED]");
    expect(result.user.name).toBe("Ada");
    expect(result.sessions[0].tokenHash).toBe("[REDACTED]");
  });

  it("is case-insensitive on key matching", () => {
    const result = redact({ ApiKey: "secret" }) as Record<string, unknown>;
    expect(result.ApiKey).toBe("[REDACTED]");
  });
});

describe("createLogger", () => {
  it("emits structured JSON in production mode", () => {
    const lines: string[] = [];
    const logger = createLogger({ service: "test-svc", isProduction: true, write: (l) => lines.push(l) });

    logger.info({ event: "user.logged_in", userId: "u1" });

    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.service).toBe("test-svc");
    expect(parsed.level).toBe("info");
    expect(parsed.event).toBe("user.logged_in");
    expect(parsed.userId).toBe("u1");
  });

  it("redacts sensitive fields before emitting", () => {
    const lines: string[] = [];
    const logger = createLogger({ service: "test-svc", isProduction: true, write: (l) => lines.push(l) });

    logger.info({ event: "user.login_attempt", password: "hunter2" });

    const parsed = JSON.parse(lines[0]!);
    expect(parsed.password).toBe("[REDACTED]");
  });

  it("respects minimum log level", () => {
    const lines: string[] = [];
    const logger = createLogger({ service: "test-svc", isProduction: true, level: "warn", write: (l) => lines.push(l) });

    logger.debug({ event: "noisy" });
    logger.info({ event: "still noisy" });
    logger.warn({ event: "important" });

    expect(lines).toHaveLength(1);
  });

  it("child() merges base context into every subsequent call", () => {
    const lines: string[] = [];
    const logger = createLogger({ service: "test-svc", isProduction: true, write: (l) => lines.push(l) });
    const requestLogger = logger.child({ requestId: "req_123" });

    requestLogger.info({ event: "handled" });

    const parsed = JSON.parse(lines[0]!);
    expect(parsed.requestId).toBe("req_123");
  });

  it("serializes an Error passed alongside error-level logs", () => {
    const lines: string[] = [];
    const logger = createLogger({ service: "test-svc", isProduction: true, write: (l) => lines.push(l) });

    logger.error({ event: "db.write_failed" }, new Error("connection refused"));

    const parsed = JSON.parse(lines[0]!);
    expect(parsed.error.message).toBe("connection refused");
    expect(parsed.error.name).toBe("Error");
  });
});

describe("request context", () => {
  it("propagates request context through async calls", async () => {
    await runWithRequestContext({ requestId: "req_abc" }, async () => {
      await Promise.resolve();
      expect(getRequestContext()?.requestId).toBe("req_abc");
    });
  });

  it("resolveRequestId reuses an inbound x-request-id header", () => {
    const headers = new Headers({ "x-request-id": "req_from_client" });
    expect(resolveRequestId(headers)).toBe("req_from_client");
  });

  it("resolveRequestId mints a new ID when none is supplied", () => {
    const headers = new Headers();
    expect(resolveRequestId(headers)).toMatch(/^req_/);
  });
});
