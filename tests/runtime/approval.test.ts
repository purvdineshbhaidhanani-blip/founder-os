import { describe, expect, it } from "vitest";
import { ApprovalSystem } from "../../src/runtime/approval/index.js";

describe("ApprovalSystem", () => {
  it("creates pending requests", () => {
    const system = new ApprovalSystem();
    const request = system.request({ reason: "deploy", payload: { env: "prod" }, requestedBy: "ops" });
    expect(request.status).toBe("pending");
  });

  it("resolves await on grant", async () => {
    const system = new ApprovalSystem();
    const request = system.request({ reason: "deploy", payload: {}, requestedBy: "ops" });
    const pending = system.await(request.id);
    system.grant(request.id, "founder", "OK");
    const decided = await pending;
    expect(decided.status).toBe("granted");
    expect(decided.decidedBy).toBe("founder");
  });

  it("rejects requests and records history", () => {
    const system = new ApprovalSystem();
    const request = system.request({ reason: "scary", payload: {}, requestedBy: "ops" });
    system.reject(request.id, "founder", "not now");
    const history = system.history();
    expect(history[0]?.status).toBe("rejected");
    expect(history[0]?.note).toBe("not now");
  });

  it("expires pending requests after timeout", async () => {
    const system = new ApprovalSystem();
    const request = system.request({
      reason: "tick",
      payload: {},
      requestedBy: "ops",
      expiresInMs: 10,
    });
    const decided = await system.await(request.id);
    expect(decided.status).toBe("expired");
  });
});
