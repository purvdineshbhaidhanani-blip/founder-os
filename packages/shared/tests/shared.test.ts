import { describe, expect, it, vi } from "vitest";
import { cronMatches, nextCronFireTime, parseCron } from "@platform/shared";
import { interpolate } from "@platform/shared";
import { computeBackoffDelay, withRetry } from "@platform/shared";
import { combineSignals, withTimeoutSignal } from "@platform/shared";
import { createHttpReachabilityCheck } from "@platform/shared";

describe("shared/cron", () => {
  it("parses and matches a standard cron expression", () => {
    const parsed = parseCron("*/15 9-17 * * 1-5");
    const monday9am = new Date(2026, 0, 5, 9, 0); // Jan 5 2026 is a Monday
    const monday915 = new Date(2026, 0, 5, 9, 15);
    const monday901 = new Date(2026, 0, 5, 9, 1);
    const saturday = new Date(2026, 0, 3, 9, 0);
    expect(cronMatches(parsed, monday9am)).toBe(true);
    expect(cronMatches(parsed, monday915)).toBe(true);
    expect(cronMatches(parsed, monday901)).toBe(false);
    expect(cronMatches(parsed, saturday)).toBe(false);
  });

  it("finds the next fire time after a given instant", () => {
    const from = new Date(2026, 0, 5, 9, 1);
    const next = nextCronFireTime("*/15 * * * *", from);
    expect(next.getMinutes()).toBe(15);
  });
});

describe("shared/interpolate", () => {
  it("renders nested paths and throws on missing values by default", () => {
    expect(interpolate("Hi {{user.name}}", { user: { name: "Ada" } })).toBe("Hi Ada");
    expect(() => interpolate("Hi {{missing}}", {})).toThrow();
    expect(interpolate("Hi {{missing}}", {}, { strict: false })).toBe("Hi {{missing}}");
  });
});

describe("shared/retry", () => {
  it("computes exponential backoff with a max delay cap", () => {
    const policy = { maxAttempts: 5, baseDelayMs: 100, backoffMultiplier: 2, maxDelayMs: 300 };
    expect(computeBackoffDelay(policy, 1)).toBe(100);
    expect(computeBackoffDelay(policy, 2)).toBe(200);
    expect(computeBackoffDelay(policy, 3)).toBe(300); // capped from 400
  });

  it("retries until success and respects maxAttempts", async () => {
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts += 1;
        if (attempts < 2) throw new Error("fail once");
        return "ok";
      },
      { maxAttempts: 3, baseDelayMs: 1 },
    );
    expect(result).toBe("ok");
    expect(attempts).toBe(2);

    await expect(
      withRetry(
        async () => {
          throw new Error("always fails");
        },
        { maxAttempts: 2, baseDelayMs: 1 },
      ),
    ).rejects.toThrow("always fails");
  });
});

describe("shared/timeout", () => {
  it("combineSignals aborts as soon as any input signal aborts", () => {
    const a = new AbortController();
    const b = new AbortController();
    const combined = combineSignals([a.signal, b.signal]);
    expect(combined?.aborted).toBe(false);
    b.abort(new Error("b aborted"));
    expect(combined?.aborted).toBe(true);
  });

  it("combineSignals returns undefined for no signals and passes through a single signal unchanged", () => {
    expect(combineSignals([undefined, undefined])).toBeUndefined();
    const a = new AbortController();
    expect(combineSignals([a.signal, undefined])).toBe(a.signal);
  });

  it("combineSignals is already-aborted-safe: combining after one signal already fired aborts immediately", () => {
    const a = new AbortController();
    a.abort();
    const combined = combineSignals([a.signal, new AbortController().signal]);
    expect(combined?.aborted).toBe(true);
  });

  it("withTimeoutSignal aborts after the given delay", async () => {
    vi.useFakeTimers();
    try {
      const { signal, cancel } = withTimeoutSignal(50);
      expect(signal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(60);
      expect(signal?.aborted).toBe(true);
      expect((signal as AbortSignal).reason).toBeInstanceOf(Error);
      cancel();
    } finally {
      vi.useRealTimers();
    }
  });

  it("withTimeoutSignal disables the timeout for 0/undefined and passes the external signal through", () => {
    const external = new AbortController();
    expect(withTimeoutSignal(0, external.signal).signal).toBe(external.signal);
    expect(withTimeoutSignal(undefined, external.signal).signal).toBe(external.signal);
    expect(withTimeoutSignal(0).signal).toBeUndefined();
  });

  it("withTimeoutSignal also aborts when the external signal aborts first", () => {
    const external = new AbortController();
    const { signal } = withTimeoutSignal(10_000, external.signal);
    external.abort(new Error("caller cancelled"));
    expect(signal?.aborted).toBe(true);
  });

  it("cancel() clears the internal timer so it never fires after the operation settles", async () => {
    vi.useFakeTimers();
    try {
      const { signal, cancel } = withTimeoutSignal(50);
      cancel();
      await vi.advanceTimersByTimeAsync(100);
      expect(signal?.aborted).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("shared/http-health", () => {
  it("reports ok when the endpoint answers below 500", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 404 }));
    const check = createHttpReachabilityCheck({ url: "https://example.com/x", fetchImpl: fetchImpl as unknown as typeof fetch });
    const result = await check();
    expect(result.status).toBe("ok");
    expect(result.details).toContain("404");
  });

  it("reports down on a 5xx response", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 503 }));
    const check = createHttpReachabilityCheck({ url: "https://example.com/x", fetchImpl: fetchImpl as unknown as typeof fetch, label: "svc" });
    const result = await check();
    expect(result.status).toBe("down");
    expect(result.details).toContain("svc");
  });

  it("reports down on a network error without throwing", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    const check = createHttpReachabilityCheck({ url: "https://example.com/x", fetchImpl: fetchImpl as unknown as typeof fetch });
    const result = await check();
    expect(result.status).toBe("down");
    expect(result.details).toContain("ECONNREFUSED");
  });

  it("reports down without a network call when url is empty", async () => {
    const fetchImpl = vi.fn();
    const check = createHttpReachabilityCheck({ url: "", fetchImpl: fetchImpl as unknown as typeof fetch });
    const result = await check();
    expect(result.status).toBe("down");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
