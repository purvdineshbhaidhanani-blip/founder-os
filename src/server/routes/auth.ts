import { z } from "zod";
import type { Router } from "../router.js";
import { sendJson } from "../router.js";
import {
  buildClearSessionCookieHeader,
  buildSessionCookieHeader,
  createSession,
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

      const cookieValue = createSession({ email, issuedAt: Date.now() });
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
    const session = readSession(ctx.req);
    if (!session) {
      sendJson(ctx.res, 401, { error: "Not authenticated." });
      return;
    }
    sendJson(ctx.res, 200, { user: { email: session.email } });
  });
}
