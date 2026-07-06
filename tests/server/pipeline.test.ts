import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "../../src/server/index.js";
import { composeAppContext } from "../../src/server/wiring.js";
import { ConnectorRegistry, BUILTIN_CONNECTORS } from "../../src/connectors/registry.js";
import { ResearchEngine } from "../../src/research/engine.js";
import type { RawResearchItem, SourceAdapter } from "../../src/research/types.js";

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

/**
 * Rich-enough synthetic item set to make ProblemIntelligenceEngine produce
 * multiple non-"other" clusters (several category phrase hits, spread
 * across two sources/authors so evidence/frequency/confidence scoring has
 * something real to compute) and OpportunityEngine to score at least one
 * opportunity from them — without any real network access.
 */
function makeItems(sourceId: string, authorPrefix: string): RawResearchItem[] {
  const now = new Date();
  const templates = [
    { title: "This onboarding flow is so tedious and takes too long", body: "So many steps just to invite a teammate, very clunky." },
    { title: "Would be great if it supported bulk CSV import", body: "There is no way to import contacts in bulk today, lacks that entirely." },
    { title: "Willing to pay for a tool that fixes this", body: "Shut up and take my money, I would pay for automated CSV import." },
    { title: "Looking for alternative to this billing dashboard", body: "Any recommendations for a replacement for this? Considering switching to something else." },
    { title: "The export button crashes every time", body: "It's a bug — the export crashes and the app is not working after that." },
  ];

  return templates.map((tpl, index) => ({
    title: tpl.title,
    body: tpl.body,
    url: `https://example.com/${sourceId}/${index}`,
    sourceId,
    author: `${authorPrefix}-${index % 3}`,
    engagement: 5 + index,
    publishedAt: new Date(now.getTime() - index * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

function keylessAdapter(id: string, items: RawResearchItem[]): SourceAdapter {
  return { id, keyless: true, fetch: async () => ({ ok: true, items }) };
}

beforeAll(async () => {
  process.env.FOUNDER_EMAIL = TEST_EMAIL;
  process.env.FOUNDER_PASSWORD = TEST_PASSWORD;
  process.env.SESSION_SECRET = "test-secret-for-pipeline-suite";
  delete process.env.GITHUB_TOKEN;
  delete process.env.YOUTUBE_API_KEY;
  delete process.env.STACK_EXCHANGE_KEY;

  const ctx = composeAppContext();

  // Swap in a ResearchEngine backed by synthetic keyless adapters so the
  // full pipeline (research -> problems -> opportunities) runs end-to-end
  // deterministically without any outbound network access, which this
  // sandboxed environment cannot reach and which the developer agent is
  // forbidden from performing anyway. Mirrors the pattern already used by
  // tests/server/routes.test.ts's 422 case, but with real items so the
  // success path can be exercised too.
  const workingAdapters: SourceAdapter[] = [
    keylessAdapter("hackernews", makeItems("hackernews", "hn-user")),
    keylessAdapter("rss", makeItems("rss", "rss-user")),
  ];
  const noKeysConnectors = new ConnectorRegistry(BUILTIN_CONNECTORS, {});
  ctx.research = new ResearchEngine({
    connectors: noKeysConnectors,
    artifacts: ctx.artifacts,
    memory: ctx.memory,
    bus: ctx.bus,
    adapters: workingAdapters,
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

async function waitForOpportunities(
  pipelineId: string,
  timeoutMs = 5000,
): Promise<{ status: number; body: any }> {
  const deadline = Date.now() + timeoutMs;
  let last: { status: number; body: any } = { status: 0, body: undefined };
  while (Date.now() < deadline) {
    const res = await fetch(`${baseUrl}/api/pipeline/${encodeURIComponent(pipelineId)}/opportunities`, {
      headers: { Cookie: sessionCookie },
    });
    const body = await res.json();
    last = { status: res.status, body };
    if (res.status === 200) return last;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return last;
}

describe("pipeline routes: auth gating", () => {
  it("requires authentication for POST /api/pipeline/run", async () => {
    const res = await fetch(`${baseUrl}/api/pipeline/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });

  it("requires authentication for GET /api/pipeline/:id/progress", async () => {
    const res = await fetch(`${baseUrl}/api/pipeline/whatever/progress`);
    expect(res.status).toBe(401);
  });

  it("requires authentication for GET /api/pipeline/:id/opportunities", async () => {
    const res = await fetch(`${baseUrl}/api/pipeline/whatever/opportunities`);
    expect(res.status).toBe(401);
  });

  it("requires authentication for GET /api/pipeline/:id/export", async () => {
    const res = await fetch(`${baseUrl}/api/pipeline/whatever/export`);
    expect(res.status).toBe(401);
  });
});

describe("pipeline routes: missing keys", () => {
  it("returns 422 with the missing-key list when no research connectors are configured and no keyless adapters are eligible", async () => {
    // A dedicated ctx/server with only keyed, unconfigured adapters — mirrors
    // tests/server/routes.test.ts's 422 case exactly, scoped to this test so
    // it does not disturb the working-adapters ctx used by the rest of this
    // file.
    const ctx = composeAppContext();
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
    const missingKeysServer = createServer(ctx);
    await new Promise<void>((resolve) => missingKeysServer.listen(0, resolve));
    const address = missingKeysServer.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const missingKeysBaseUrl = `http://127.0.0.1:${port}`;

    try {
      const res = await fetch(`${missingKeysBaseUrl}/api/pipeline/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ windowDays: 7 }),
      });
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.error).toBeTruthy();
      expect(body.missing).toEqual(expect.arrayContaining(["GITHUB_TOKEN", "YOUTUBE_API_KEY"]));
    } finally {
      await new Promise<void>((resolve, reject) => {
        missingKeysServer.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });
});

describe("pipeline routes: end-to-end success", () => {
  let pipelineId: string;
  let opportunityReport: any;

  it("accepts POST /api/pipeline/run and returns a pipelineId", async () => {
    const res = await fetch(`${baseUrl}/api/pipeline/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({ windowDays: 30 }),
    });
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(typeof body.pipelineId).toBe("string");
    pipelineId = body.pipelineId;
  });

  it("produces a real TopOpportunitiesReport reachable via GET /api/pipeline/:id/opportunities", async () => {
    const { status, body } = await waitForOpportunities(pipelineId);
    expect(status).toBe(200);
    opportunityReport = body;

    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("sourceSessionId");
    expect(body).toHaveProperty("sourceProblemReportId");
    expect(Array.isArray(body.opportunities)).toBe(true);
    expect(body.opportunities.length).toBeGreaterThan(0);

    const first = body.opportunities[0];
    expect(typeof first.problem).toBe("string");
    expect(typeof first.painScore).toBe("number");
    expect(first.scoreBreakdown).toHaveProperty("weightedTotal");
    expect(first.scoreBreakdown).toHaveProperty("explanation");
    expect(["BUILD", "WAIT", "IGNORE"]).toContain(first.recommendation.verdict);
    expect(first.confidence).toHaveProperty("band");
    expect(Array.isArray(first.supportingEvidence.urls)).toBe(true);
  });

  it("replays SSE progress events across all three stages for a completed pipeline", async () => {
    // The pipeline is already done by this point (the previous test polled
    // until it was), so this connection replays the buffered event log and
    // closes immediately rather than staying open indefinitely.
    const res = await fetch(`${baseUrl}/api/pipeline/${encodeURIComponent(pipelineId)}/progress`, {
      headers: { Cookie: sessionCookie },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    const text = await res.text();
    expect(text).toContain('"stage":"research"');
    expect(text).toContain('"stage":"problems"');
    expect(text).toContain('"stage":"opportunities"');
    expect(text).toContain('"stage":"complete"');
  });

  it("returns a single opportunity detail via GET /api/pipeline/:id/opportunities/:opportunityId", async () => {
    const opportunityId = opportunityReport.opportunities[0].id;
    const res = await fetch(
      `${baseUrl}/api/pipeline/${encodeURIComponent(pipelineId)}/opportunities/${encodeURIComponent(opportunityId)}`,
      { headers: { Cookie: sessionCookie } },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(opportunityId);
    expect(body.problem).toBe(opportunityReport.opportunities[0].problem);
  });

  it("returns 404 for an unknown opportunityId on a known pipeline", async () => {
    const res = await fetch(
      `${baseUrl}/api/pipeline/${encodeURIComponent(pipelineId)}/opportunities/does-not-exist`,
      { headers: { Cookie: sessionCookie } },
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 for an unknown pipelineId", async () => {
    const res = await fetch(`${baseUrl}/api/pipeline/unknown-pipeline/opportunities`, {
      headers: { Cookie: sessionCookie },
    });
    expect(res.status).toBe(404);
  });

  it("requires authentication for the Founder Copilot routes", async () => {
    const questions = await fetch(`${baseUrl}/api/copilot/questions`);
    expect(questions.status).toBe(401);
    const answers = await fetch(
      `${baseUrl}/api/pipeline/${encodeURIComponent(pipelineId)}/opportunities/whatever/copilot/answers`,
    );
    expect(answers.status).toBe(401);
    const ask = await fetch(
      `${baseUrl}/api/pipeline/${encodeURIComponent(pipelineId)}/opportunities/whatever/copilot/ask`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: "why?" }) },
    );
    expect(ask.status).toBe(401);
  });

  it("lists the supported Founder Copilot questions via GET /api/copilot/questions", async () => {
    const res = await fetch(`${baseUrl}/api/copilot/questions`, { headers: { Cookie: sessionCookie } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.canonical)).toBe(true);
    expect(Array.isArray(body.additional)).toBe(true);
    expect(body.canonical.length).toBe(8);
    expect(body.additional.length).toBe(8);
  });

  it("answers the full Copilot battery for a real opportunity via GET .../copilot/answers", async () => {
    const opportunityId = opportunityReport.opportunities[0].id;
    const res = await fetch(
      `${baseUrl}/api/pipeline/${encodeURIComponent(pipelineId)}/opportunities/${encodeURIComponent(opportunityId)}/copilot/answers`,
      { headers: { Cookie: sessionCookie } },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.opportunityId).toBe(opportunityId);
    // 8 canonical + 8 additional.
    expect(body.answers.length).toBe(16);
    const first = body.answers[0];
    expect(typeof first.question).toBe("string");
    expect(typeof first.topic).toBe("string");
    expect(typeof first.answer).toBe("string");
    expect(Array.isArray(first.citations)).toBe(true);
    expect(typeof first.notVerified).toBe("boolean");
  });

  it("answers a single free-text Copilot question via POST .../copilot/ask", async () => {
    const opportunityId = opportunityReport.opportunities[0].id;
    const res = await fetch(
      `${baseUrl}/api/pipeline/${encodeURIComponent(pipelineId)}/opportunities/${encodeURIComponent(opportunityId)}/copilot/ask`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ question: "What should I build?" }),
      },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.opportunityId).toBe(opportunityId);
    expect(body.answer.question).toBe("What should I build?");
    expect(typeof body.answer.answer).toBe("string");
    expect(body.answer.answer.length).toBeGreaterThan(0);
  });

  it("rejects an empty Copilot question body with 400", async () => {
    const opportunityId = opportunityReport.opportunities[0].id;
    const res = await fetch(
      `${baseUrl}/api/pipeline/${encodeURIComponent(pipelineId)}/opportunities/${encodeURIComponent(opportunityId)}/copilot/ask`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: sessionCookie },
        body: JSON.stringify({ question: "" }),
      },
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for the Copilot on an unknown opportunityId", async () => {
    const res = await fetch(
      `${baseUrl}/api/pipeline/${encodeURIComponent(pipelineId)}/opportunities/does-not-exist/copilot/answers`,
      { headers: { Cookie: sessionCookie } },
    );
    expect(res.status).toBe(404);
  });

  it("exports Markdown with the right content-type and a non-empty body", async () => {
    const res = await fetch(`${baseUrl}/api/pipeline/${encodeURIComponent(pipelineId)}/export?format=markdown`, {
      headers: { Cookie: sessionCookie },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/markdown");
    expect(res.headers.get("content-disposition")).toContain("founder-report.md");
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain("# Top Founder Opportunities");
  });

  it("exports JSON with the right content-type and a non-empty, valid-JSON body", async () => {
    const res = await fetch(`${baseUrl}/api/pipeline/${encodeURIComponent(pipelineId)}/export?format=json`, {
      headers: { Cookie: sessionCookie },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(res.headers.get("content-disposition")).toContain("founder-report.json");
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
    const parsed = JSON.parse(text);
    expect(parsed.id).toBe(opportunityReport.id);
  });
});
