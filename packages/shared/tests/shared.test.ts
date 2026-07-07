import { describe, expect, it } from "vitest";
import { cronMatches, nextCronFireTime, parseCron } from "@platform/shared";
import { interpolate } from "@platform/shared";
import { computeBackoffDelay, withRetry } from "@platform/shared";

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
