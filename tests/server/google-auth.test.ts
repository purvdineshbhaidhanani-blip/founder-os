import type { Server } from "node:http";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer } from "../../src/server/index.js";
import { composeAppContext } from "../../src/server/wiring.js";

let server: Server;
let baseUrl: string;

const originalFetch = global.fetch;
const originalEnv = { ...process.env };

function extractCookieValue(setCookieHeader: string | null, name: string): string | null {
  if (!setCookieHeader) return null;
  // Node's fetch merges multiple Set-Cookie headers with ", " when read via
  // `.get()`; find the segment for the cookie we care about regardless of
  // how many other cookies are present alongside it.
  const parts = setCookieHeader.split(/,(?=\s*[^;]+=)/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) {
      return trimmed.split(";")[0]!.slice(name.length + 1);
    }
  }
  return null;
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

beforeAll(async () => {
  process.env.FOUNDER_EMAIL = "founder@example.com";
  process.env.FOUNDER_PASSWORD = "correct-horse-battery-staple";
  process.env.SESSION_SECRET = "test-secret-for-google-auth-suite";

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

afterEach(() => {
  global.fetch = originalFetch;
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("GET /api/auth/google", () => {
  beforeEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  });

  it("returns 500 with a clear error when GOOGLE_CLIENT_ID is not configured", async () => {
    const res = await originalFetch(`${baseUrl}/api/auth/google`, { redirect: "manual" });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Google Sign-In is not configured on this server.");
  });

  it("redirects (302) to Google's consent URL with client_id and state, and sets a google_oauth_state cookie", async () => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";

    const res = await originalFetch(`${baseUrl}/api/auth/google`, { redirect: "manual" });
    expect(res.status).toBe(302);

    const location = res.headers.get("location");
    expect(location).toBeTruthy();
    expect(location).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(location).toContain(`client_id=${encodeURIComponent("test-client-id.apps.googleusercontent.com")}`);
    expect(location).toMatch(/[?&]state=[0-9a-f]+/);
    expect(location).toContain("scope=openid+email+profile");

    const setCookie = res.headers.get("set-cookie");
    const stateCookie = extractCookieValue(setCookie, "google_oauth_state");
    expect(stateCookie).toBeTruthy();

    const stateInUrl = new URL(location!).searchParams.get("state");
    expect(stateCookie).toBe(stateInUrl);
  });
});

describe("GET /api/auth/google/callback", () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
  });

  it("rejects mismatched state (redirects to /login?error=oauth_state_mismatch) and does not create a session", async () => {
    global.fetch = vi.fn() as unknown as typeof fetch;

    const res = await originalFetch(
      `${baseUrl}/api/auth/google/callback?code=some-code&state=wrong-state`,
      {
        redirect: "manual",
        headers: { Cookie: "google_oauth_state=correct-state" },
      },
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login?error=oauth_state_mismatch");

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).not.toContain("founder_session=");

    // No token exchange should have been attempted for a state mismatch.
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("rejects when state cookie is missing entirely", async () => {
    global.fetch = vi.fn() as unknown as typeof fetch;

    const res = await originalFetch(`${baseUrl}/api/auth/google/callback?code=some-code&state=anything`, {
      redirect: "manual",
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login?error=oauth_state_mismatch");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("creates a session with provider: google and the correct email, then redirects to /dashboard, given valid state + mocked token exchange + mocked userinfo", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return Promise.resolve(jsonResponse({ access_token: "test-access-token" }));
      }
      if (url === "https://www.googleapis.com/oauth2/v3/userinfo") {
        return Promise.resolve(
          jsonResponse({
            email: "googleuser@example.com",
            email_verified: true,
            name: "Google User",
          }),
        );
      }
      throw new Error(`Unexpected fetch to ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await originalFetch(
      `${baseUrl}/api/auth/google/callback?code=valid-code&state=matching-state`,
      {
        redirect: "manual",
        headers: { Cookie: "google_oauth_state=matching-state" },
      },
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/dashboard");

    const setCookie = res.headers.get("set-cookie");
    const sessionCookie = extractCookieValue(setCookie, "founder_session");
    expect(sessionCookie).toBeTruthy();

    // Verify the session actually works and carries the Google-verified
    // email + provider by calling the real /api/auth/me with it.
    const meRes = await originalFetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `founder_session=${sessionCookie}` },
    });
    expect(meRes.status).toBe(200);
    const meBody = await meRes.json();
    expect(meBody.user.email).toBe("googleuser@example.com");
    expect(meBody.user.provider).toBe("google");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("rejects when the userinfo response has email_verified: false", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return Promise.resolve(jsonResponse({ access_token: "test-access-token" }));
      }
      if (url === "https://www.googleapis.com/oauth2/v3/userinfo") {
        return Promise.resolve(
          jsonResponse({
            email: "unverified@example.com",
            email_verified: false,
          }),
        );
      }
      throw new Error(`Unexpected fetch to ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await originalFetch(
      `${baseUrl}/api/auth/google/callback?code=valid-code&state=matching-state-2`,
      {
        redirect: "manual",
        headers: { Cookie: "google_oauth_state=matching-state-2" },
      },
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login?error=oauth_failed");

    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).not.toContain("founder_session=");
  });

  it("rejects and does not leak Google's error details when the token exchange fails", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return Promise.resolve(
          jsonResponse({ error: "invalid_grant", error_description: "Bad code" }, false, 400),
        );
      }
      throw new Error(`Unexpected fetch to ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const res = await originalFetch(
      `${baseUrl}/api/auth/google/callback?code=bad-code&state=matching-state-3`,
      {
        redirect: "manual",
        headers: { Cookie: "google_oauth_state=matching-state-3" },
      },
    );

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login?error=oauth_failed");
    expect(res.headers.get("location")).not.toContain("invalid_grant");
  });
});
