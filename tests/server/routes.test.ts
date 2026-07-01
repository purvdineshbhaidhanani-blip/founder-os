import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "../../src/server/index.js";
import { composeAppContext } from "../../src/server/wiring.js";
import { ConnectorRegistry, BUILTIN_CONNECTORS } from "../../src/connectors/registry.js";
import { ResearchEngine } from "../../src/research/engine.js";
import type { SourceAdapter } from "../../src/research/types.js";

const TEST_EMAIL = "founder@example.com";
const TEST_PASSWORD = "correct-horse-battery-staple";

let server: Server;
let baseUrl: string;
let sessionCookie: string;

async function login(): Promise<string> {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  });
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) throw new Error("Login did not set a session cookie.");
  return setCookie.split(";")[0]!;
}

beforeAll(async () => {
  process.env.FOUNDER_EMAIL = TEST_EMAIL;
  process.env.FOUNDER_PASSWORD = TEST_PASSWORD;
  process.env.SESSION_SECRET = "test-secret-for-routes-suite";
  // Ensure a clean slate: no research connector env vars configured, so
  // /api/research/run should hit the MissingKeysError 422 path.
  delete process.env.GITHUB_TOKEN;
  delete process.env.YOUTUBE_API_KEY;
  delete process.env.STACK_EXCHANGE_KEY;

  const ctx = composeAppContext();

  // The real ALL_SOURCE_ADAPTERS include hackernews/rss, which are keyless
  // and therefore always "eligible" regardless of env vars — they make real
  // outbound network calls, which this sandboxed environment cannot reach
  // and the developer agent is forbidden from performing anyway. To
  // deterministically exercise the 422/MissingKeysError path without any
  // network access, we swap in a ResearchEngine restricted to only the
  // *keyed-with-a-required-env* adapters (github/youtube — note that
  // "stackexchange" is deliberately excluded: per
  // connectors/registry.ts's BUILTIN_CONNECTORS, stackexchange's API key is
  // optional (`requiredEnv: []`), so ConnectorRegistry always reports it as
  // "configured" and it would keep at least one source eligible). With only
  // github/youtube — both of which have a non-empty requiredEnv and neither
  // configured — zero sources are eligible, exactly like
  // tests/research/engine.test.ts's "throws MissingKeysError" case.
  const keyedOnlyAdapters: SourceAdapter[] = [
    { id: "github", keyless: false, fetch: async () => ({ ok: true, items: [] }) },
    { id: "youtube", keyless: false, fetch: async () => ({ ok: true, items: [] }) },
  ];
  const noKeysConnectors = new ConnectorRegistry(BUILTIN_CONNECTORS, {});
  ctx.research = new ResearchEngine({
    connectors: noKeysConnectors,
    artifacts: ctx.artifacts,
    memory: ctx.memory,
    bus: ctx.bus,
    adapters: keyedOnlyAdapters,
  });

  server = createServer(ctx);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;

  sessionCookie = await login();
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("dashboard route", () => {
  it("requires authentication", async () => {
    const res = await fetch(`${baseUrl}/api/dashboard`);
    expect(res.status).toBe(401);
  });

  it("returns the founder dashboard shape when authenticated", async () => {
    const res = await fetch(`${baseUrl}/api/dashboard`, {
      headers: { Cookie: sessionCookie },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("takenAt");
    expect(body).toHaveProperty("runtime");
    expect(body).toHaveProperty("health");
    expect(body).toHaveProperty("notifications");
    expect(body).toHaveProperty("pendingApprovals");
    expect(body).toHaveProperty("proposals");
    expect(body).toHaveProperty("costRecommendations");
    expect(body).toHaveProperty("costSummary");
    expect(body).toHaveProperty("upcomingEvents");
  });
});

describe("connectors route", () => {
  it("requires authentication", async () => {
    const res = await fetch(`${baseUrl}/api/connectors/status`);
    expect(res.status).toBe(401);
  });

  it("returns research-relevant connectors including synthesized keyless sources", async () => {
    const res = await fetch(`${baseUrl}/api/connectors/status`, {
      headers: { Cookie: sessionCookie },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);

    const ids = body.map((entry: { id: string }) => entry.id);
    expect(ids).toEqual(expect.arrayContaining(["github", "youtube", "stackexchange", "hackernews", "rss"]));

    for (const entry of body) {
      expect(entry).toHaveProperty("id");
      expect(entry).toHaveProperty("name");
      expect(entry).toHaveProperty("status");
      expect(entry).toHaveProperty("missingEnv");
      expect(entry).toHaveProperty("required");
    }

    const hackernews = body.find((entry: { id: string }) => entry.id === "hackernews");
    expect(hackernews.status).toBe("configured");
    expect(hackernews.missingEnv).toEqual([]);

    const github = body.find((entry: { id: string }) => entry.id === "github");
    expect(github.status).toBe("missing-credentials");
    expect(github.missingEnv).toContain("GITHUB_TOKEN");
  });

  it("does not include unrelated connectors like stripe or slack", async () => {
    const res = await fetch(`${baseUrl}/api/connectors/status`, {
      headers: { Cookie: sessionCookie },
    });
    const body = await res.json();
    const ids = body.map((entry: { id: string }) => entry.id);
    expect(ids).not.toContain("stripe");
    expect(ids).not.toContain("slack");
  });
});

describe("research route", () => {
  it("requires authentication for /api/research/run", async () => {
    const res = await fetch(`${baseUrl}/api/research/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });

  it("returns 422 with the missing-key list when no research connectors are configured", async () => {
    const res = await fetch(`${baseUrl}/api/research/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({ windowDays: 7 }),
    });

    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBeTruthy();
    expect(body.missing).toEqual(expect.arrayContaining(["GITHUB_TOKEN", "YOUTUBE_API_KEY"]));
  });
});
