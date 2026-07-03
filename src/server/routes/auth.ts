import { randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { RequestContext, Router } from "../router.js";
import { sendJson } from "../router.js";
import {
  buildClearOAuthStateCookieHeader,
  buildClearSessionCookieHeader,
  buildOAuthStateCookieHeader,
  buildSessionCookieHeader,
  createSession,
  OAUTH_STATE_COOKIE,
  parseCookies,
  SESSION_COOKIE,
  verifySession,
  type SessionPayload,
} from "../session.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("server.routes.auth");

const LoginBody = z.object({
  email: z.string().min(1, "email is required"),
  password: z.string().min(1, "password is required"),
});

/** Reads and verifies the session cookie from an incoming request, or returns null. */
export function readSession(req: { headers: { cookie?: string } }): SessionPayload | null {
  const cookies = parseCookies(req.headers.cookie);
  return verifySession(cookies[SESSION_COOKIE]);
}

/**
 * Resolves the Google OAuth callback `redirect_uri`: prefer an explicit
 * `GOOGLE_REDIRECT_URI` (required in production, since it must exactly match
 * what's registered in the Google Cloud Console OAuth client), falling back
 * to a `localhost` default derived from `PORT` for local dev — the same
 * "sensible default, explicit override" pattern `PORT` itself uses in
 * `src/server/index.ts`.
 */
function resolveGoogleRedirectUri(): string {
  const fromEnv = process.env.GOOGLE_REDIRECT_URI;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  const port = Number(process.env.PORT) || 4173;
  return `http://localhost:${port}/api/auth/google/callback`;
}

function buildGoogleAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Constant-time comparison of two cookie/query string values, mirroring how `verifySession` compares signatures. */
function safeEquals(a: string | undefined | null, b: string | undefined | null): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  email?: string;
  email_verified?: boolean;
  name?: string;
}

function redirectTo(res: import("node:http").ServerResponse, location: string): void {
  res.writeHead(302, { Location: location });
  res.end();
}

export function registerAuthRoutes(router: Router): void {
  router.post<z.infer<typeof LoginBody>>(
    "/api/auth/login",
    (ctx) => {
      const { email, password } = ctx.body;
      const expectedEmail = process.env.FOUNDER_EMAIL;
      const expectedPassword = process.env.FOUNDER_PASSWORD;

      if (!expectedEmail || !expectedPassword) {
        logger.error("FOUNDER_EMAIL / FOUNDER_PASSWORD not configured");
        sendJson(ctx.res, 500, { error: "Login is not configured on this server." });
        return;
      }

      if (email !== expectedEmail || password !== expectedPassword) {
        sendJson(ctx.res, 401, { error: "Invalid email or password." });
        return;
      }

      const cookieValue = createSession({ email, issuedAt: Date.now(), provider: "founder" });
      ctx.res.setHeader("Set-Cookie", buildSessionCookieHeader(cookieValue));
      sendJson(ctx.res, 200, { user: { email } });
    },
    LoginBody,
  );

  router.post("/api/auth/logout", (ctx) => {
    ctx.res.setHeader("Set-Cookie", buildClearSessionCookieHeader());
    ctx.res.writeHead(204);
    ctx.res.end();
  });

  router.get("/api/auth/me", (ctx) => {
    // Session-check endpoint, not a protected resource: "no session yet" is
    // an expected, routine state (every fresh/unauthenticated page load hits
    // this once), so it always responds 200 with `user: null` rather than a
    // 401. A real 401 here would make the browser log a network error on
    // every single first paint of the app, which is indistinguishable from
    // an actual failure in devtools/console-based monitoring.
    const session = readSession(ctx.req);
    if (!session) {
      sendJson(ctx.res, 200, { user: null });
      return;
    }
    sendJson(ctx.res, 200, { user: { email: session.email, provider: session.provider ?? "founder" } });
  });

  // --- Google Sign-In (second, additional login method) ---
  //
  // Manual OAuth 2.0 Authorization Code flow — no new dependency, matches
  // this codebase's existing "no unnecessary dependencies" style (the same
  // approach `src/research/sources/*` already use for other third-party
  // HTTP APIs via the built-in `fetch`). There is no database/user table:
  // the verified Google email becomes the identity in the same stateless,
  // HMAC-signed session cookie the founder login already uses.

  router.get("/api/auth/google", (ctx) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      logger.error("GOOGLE_CLIENT_ID not configured");
      sendJson(ctx.res, 500, { error: "Google Sign-In is not configured on this server." });
      return;
    }

    const state = randomBytes(24).toString("hex");
    const redirectUri = resolveGoogleRedirectUri();
    const authUrl = buildGoogleAuthUrl(clientId, redirectUri, state);

    ctx.res.setHeader("Set-Cookie", buildOAuthStateCookieHeader(state));
    redirectTo(ctx.res, authUrl);
  });

  router.get("/api/auth/google/callback", handleGoogleCallback);
}

async function handleGoogleCallback(ctx: Pick<RequestContext, "req" | "res" | "query">): Promise<void> {
  const cookies = parseCookies(ctx.req.headers.cookie);
  const cookieState = cookies[OAUTH_STATE_COOKIE];
  const queryState = ctx.query.get("state");
  const code = ctx.query.get("code");

  // Always clear the (now single-use) state cookie once we've read it,
  // regardless of the outcome below.
  ctx.res.setHeader("Set-Cookie", buildClearOAuthStateCookieHeader());

  if (!safeEquals(cookieState, queryState)) {
    logger.error("Google OAuth callback: state mismatch");
    redirectTo(ctx.res, "/login?error=oauth_state_mismatch");
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret || !code) {
    logger.error("Google OAuth callback: missing server configuration or authorization code");
    redirectTo(ctx.res, "/login?error=oauth_failed");
    return;
  }

  try {
    const redirectUri = resolveGoogleRedirectUri();
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    const tokenBody = (await tokenRes.json()) as GoogleTokenResponse;
    if (!tokenRes.ok || !tokenBody.access_token) {
      // Never leak Google's raw error response to the client redirect URL —
      // log it server-side only.
      logger.error("Google OAuth token exchange failed", {
        status: tokenRes.status,
        error: tokenBody.error,
      });
      redirectTo(ctx.res, "/login?error=oauth_failed");
      return;
    }

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` },
    });

    if (!userInfoRes.ok) {
      logger.error("Google OAuth userinfo request failed", { status: userInfoRes.status });
      redirectTo(ctx.res, "/login?error=oauth_failed");
      return;
    }

    const userInfo = (await userInfoRes.json()) as GoogleUserInfo;
    if (!userInfo.email || userInfo.email_verified !== true) {
      logger.error("Google OAuth callback: email missing or not verified");
      redirectTo(ctx.res, "/login?error=oauth_failed");
      return;
    }

    const cookieValue = createSession({ email: userInfo.email, issuedAt: Date.now(), provider: "google" });
    ctx.res.setHeader("Set-Cookie", [buildClearOAuthStateCookieHeader(), buildSessionCookieHeader(cookieValue)]);
    redirectTo(ctx.res, "/dashboard");
  } catch (error) {
    logger.error("Google OAuth callback failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    redirectTo(ctx.res, "/login?error=oauth_failed");
  }
}
