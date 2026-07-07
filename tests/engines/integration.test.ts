import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { ApiKeyAuthStrategy } from "../../src/engines/integration/auth/api-key.js";
import { OAuth2Client } from "../../src/engines/integration/auth/oauth.js";
import { Connector } from "../../src/engines/integration/connector.js";
import { TokenBucketRateLimiter } from "../../src/engines/integration/rate-limiter.js";
import { HmacWebhookVerifier } from "../../src/engines/integration/webhook.js";

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
});
