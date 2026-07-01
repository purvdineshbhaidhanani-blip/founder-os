import type { RequestContext } from "../router.js";
import { sendJson } from "../router.js";
import { readSession } from "./auth.js";
import type { SessionPayload } from "../session.js";

/**
 * Verifies the request carries a valid session cookie. Returns the session
 * payload on success; writes a 401 JSON response and returns null if the
 * request is unauthenticated (callers should return immediately in that
 * case).
 */
export function requireSession(ctx: Pick<RequestContext, "req" | "res">): SessionPayload | null {
  const session = readSession(ctx.req);
  if (!session) {
    sendJson(ctx.res, 401, { error: "Not authenticated." });
    return null;
  }
  return session;
}
