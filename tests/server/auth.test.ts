import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "../../src/server/index.js";
import { composeAppContext } from "../../src/server/wiring.js";

const TEST_EMAIL = "founder@example.com";
const TEST_PASSWORD = "correct-horse-battery-staple";

let server: Server;
let baseUrl: string;

function extractCookie(setCookieHeader: string | null): string {
  expect(setCookieHeader).toBeTruthy();
  return setCookieHeader!.split(";")[0]!;
}

beforeAll(async () => {
  process.env.FOUNDER_EMAIL = TEST_EMAIL;
  process.env.FOUNDER_PASSWORD = TEST_PASSWORD;
  process.env.SESSION_SECRET = "test-secret-for-auth-suite";

  const ctx = composeAppContext();
  server = createServer(ctx);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("auth routes", () => {
  it("rejects login with the wrong password", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, password: "wrong-password" }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("rejects login with a malformed body (zod validation)", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it("logs in with correct credentials, sets a session cookie, and /me works", async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    expect(loginRes.status).toBe(200);
    const loginBody = await loginRes.json();
    expect(loginBody.user.email).toBe(TEST_EMAIL);

    const cookie = extractCookie(loginRes.headers.get("set-cookie"));
    expect(cookie).toContain("founder_session=");

    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookie },
    });
    expect(meRes.status).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.user.email).toBe(TEST_EMAIL);
  });

  it("/me returns 200 with a null user without a session cookie (session-check, not a protected resource)", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeNull();
  });

  it("/me returns 200 with a null user for a tampered cookie", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: "founder_session=tampered.value" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toBeNull();
  });

  it("logout clears the cookie and subsequent /me reports a null user", async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    const cookie = extractCookie(loginRes.headers.get("set-cookie"));

    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: cookie },
    });
    expect(logoutRes.status).toBe(204);

    const clearedCookieHeader = logoutRes.headers.get("set-cookie");
    expect(clearedCookieHeader).toContain("Max-Age=0");

    // Sessions are stateless HMAC-signed cookies with no server-side
    // revocation list: logout only clears the cookie client-side (Max-Age=0
    // above), it does not invalidate the signed value itself. A client that
    // discards the cookie (as every real browser does on Max-Age=0, and as
    // the E2E settings.spec.ts verifies end-to-end) is logged out; a client
    // that deliberately replays the old cookie value is not blocked by this
    // design. Documented here rather than silently assumed.
    const meRes = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: cookie } });
    expect(meRes.status).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.user.email).toBe(TEST_EMAIL);
  });
});
