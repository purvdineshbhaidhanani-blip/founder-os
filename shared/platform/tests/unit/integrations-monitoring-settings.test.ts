import { createHmac } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { verifyInboundWebhookSignature } from "../../src/integrations/webhooks.js";
import { PERFORMANCE_BUDGETS, isWithinBudget } from "../../src/monitoring/performance-budgets.js";
import { captureError, registerErrorSink } from "../../src/monitoring/errors.js";

describe("verifyInboundWebhookSignature", () => {
  const secret = "test-webhook-secret";
  const payload = JSON.stringify({ event: "lead.created", id: "123" });

  function sign(p: string, s: string): string {
    return createHmac("sha256", s).update(p).digest("hex");
  }

  it("accepts a correctly signed payload", () => {
    const signature = sign(payload, secret);
    expect(verifyInboundWebhookSignature({ payload, signature, secret })).toBe(true);
  });

  it("rejects a payload with the wrong signature", () => {
    const signature = sign(payload, "wrong-secret");
    expect(verifyInboundWebhookSignature({ payload, signature, secret })).toBe(false);
  });

  it("rejects a tampered payload even with a validly-formatted signature", () => {
    const signature = sign(payload, secret);
    const tamperedPayload = JSON.stringify({ event: "lead.created", id: "999" });
    expect(verifyInboundWebhookSignature({ payload: tamperedPayload, signature, secret })).toBe(false);
  });

  it("rejects a signature of the wrong length without throwing", () => {
    expect(verifyInboundWebhookSignature({ payload, signature: "short", secret })).toBe(false);
  });
});

describe("performance budgets", () => {
  it("exposes the documented budget values", () => {
    expect(PERFORMANCE_BUDGETS.LCP_MS).toBe(2500);
    expect(PERFORMANCE_BUDGETS.INP_MS).toBe(200);
    expect(PERFORMANCE_BUDGETS.CLS).toBe(0.1);
  });

  it("isWithinBudget returns true at or under the threshold", () => {
    expect(isWithinBudget("LCP_MS", 2500)).toBe(true);
    expect(isWithinBudget("LCP_MS", 2000)).toBe(true);
  });

  it("isWithinBudget returns false over the threshold", () => {
    expect(isWithinBudget("LCP_MS", 3000)).toBe(false);
  });
});

describe("error capture", () => {
  beforeEach(() => {
    registerErrorSink(() => {}); // reset to a no-op between tests
  });

  it("invokes the registered sink with the error and context", () => {
    const sink = vi.fn();
    registerErrorSink(sink);

    const err = new Error("something broke");
    captureError(err, { feature: "spendgov.cfo_copilot" });

    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink).toHaveBeenCalledWith(err, expect.objectContaining({ feature: "spendgov.cfo_copilot" }));
  });

  it("does not throw if the registered sink itself throws", () => {
    registerErrorSink(() => {
      throw new Error("sink is broken");
    });
    expect(() => captureError(new Error("original error"))).not.toThrow();
  });
});
