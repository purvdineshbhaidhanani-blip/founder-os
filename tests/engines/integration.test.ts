import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { ApiKeyAuthStrategy } from "../../src/engines/integration/auth/api-key.js";
import { OAuth2AuthStrategy, OAuth2Client } from "../../src/engines/integration/auth/oauth.js";
import { Connector } from "../../src/engines/integration/connector.js";
import { TokenBucketRateLimiter } from "../../src/engines/integration/rate-limiter.js";
import { HmacWebhookVerifier } from "../../src/engines/integration/webhook.js";
import { SyncJobRunner } from "../../src/engines/integration/sync-job.js";

describe("Integration Framework", () => {
  it("ApiKeyAuthStrategy attaches the key as a header by default", async () => {
    const auth = new ApiKeyAuthStrategy({ key: "secret", prefix: "Bearer " });
    const request = { headers: {} as Record<string, string>, query: {} as Record<string, string> };
    await auth.applyAuth(request);
    expect(request.headers.Authorization).toBe("Bearer secret");
  });

  it("HmacWebhookVerifier accepts a correctly signed payload and rejects a tampered one", () => {
    const secret = "whsec_test";
    const body = JSON.stringify({ hello: "world" });
    const signature = createHmac("sha256", secret).update(body).digest("hex");
    const verifier = new HmacWebhookVerifier({ secret });
    expect(verifier.verify(body, signature)).toBe(true);
    expect(verifier.verify(body + "tampered", signature)).toBe(false);
  });

  it("TokenBucketRateLimiter denies once capacity is exhausted", () => {
    const limiter = new TokenBucketRateLimiter({ capacity: 2, refillPerSecond: 0.001 });
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);
  });

  it("TokenBucketRateLimiter rejects a non-positive refillPerSecond instead of hanging forever", () => {
    expect(() => new TokenBucketRateLimiter({ capacity: 1, refillPerSecond: 0 })).toThrow();
    expect(() => new TokenBucketRateLimiter({ capacity: 1, refillPerSecond: -1 })).toThrow();
    expect(() => new TokenBucketRateLimiter({ capacity: 0, refillPerSecond: 1 })).toThrow();
  });

  it("Connector does not retry by default (no silent retry of a non-idempotent request)", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      return new Response("server error", { status: 500 });
    });
    const connector = new Connector({
      id: "test-api",
      baseUrl: "https://api.example.com",
      auth: new ApiKeyAuthStrategy({ key: "k" }),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await expect(connector.request({ path: "/widgets", method: "POST" })).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it("Connector applies auth, builds the URL, and retries on failure", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      if (calls === 1) return new Response("server error", { status: 500 });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const connector = new Connector({
      id: "test-api",
      baseUrl: "https://api.example.com",
      auth: new ApiKeyAuthStrategy({ key: "k" }),
      retry: { maxAttempts: 2, baseDelayMs: 1 },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await connector.request<{ ok: boolean }>({ path: "/widgets" });
    expect(result).toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it("OAuth2Client builds an authorization URL with the expected query params", () => {
    const client = new OAuth2Client({
      authorizationUrl: "https://provider.example.com/oauth/authorize",
      tokenUrl: "https://provider.example.com/oauth/token",
      clientId: "client-1",
      clientSecret: "secret",
      redirectUri: "https://app.example.com/callback",
      scopes: ["read", "write"],
    });
    const url = new URL(client.authorizationUrl("state-123"));
    expect(url.searchParams.get("client_id")).toBe("client-1");
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("scope")).toBe("read write");
  });

  it("OAuth2AuthStrategy coalesces concurrent refreshes into a single call", async () => {
    let refreshCalls = 0;
    const client = {
      refresh: vi.fn(async () => {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { accessToken: `token-${refreshCalls}`, refreshToken: "rt-1", expiresAt: new Date(Date.now() + 3_600_000).toISOString() };
      }),
    };
    const strategy = new OAuth2AuthStrategy({
      client: client as unknown as OAuth2Client,
      token: { accessToken: "stale", refreshToken: "rt-1", expiresAt: new Date(Date.now() - 1000).toISOString() },
    });

    const requests = [
      { headers: {} as Record<string, string>, query: {} as Record<string, string> },
      { headers: {} as Record<string, string>, query: {} as Record<string, string> },
      { headers: {} as Record<string, string>, query: {} as Record<string, string> },
    ];
    await Promise.all(requests.map((req) => strategy.applyAuth(req)));

    expect(refreshCalls).toBe(1);
    expect(requests.every((req) => req.headers.Authorization === "Bearer token-1")).toBe(true);
  });

  it("SyncJobRunner does not retry by default", async () => {
    let attempts = 0;
    const result = await new SyncJobRunner().run(
      async () => {
        attempts += 1;
        throw new Error("sync failed");
      },
      { connectorId: "c1" },
    );
    expect(attempts).toBe(1);
    expect(result.status).toBe("failed");
  });
});
