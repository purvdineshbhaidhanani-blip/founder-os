import { cookies } from "next/headers";
import { validateSessionToken } from "@founder-os/platform/auth";
import { PlatformError } from "@founder-os/platform/errors";

export const SESSION_COOKIE_NAME = "spendgov_session";

export interface CurrentSession {
  userId: string;
  sessionId: string;
}

/** Reads and validates the session cookie for the current request — the only place route handlers/pages should resolve "who is logged in." */
export async function getCurrentSession(): Promise<CurrentSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const valid = await validateSessionToken(token);
  if (!valid) return null;

  return { userId: valid.userId, sessionId: valid.sessionId };
}

/** Throws UNAUTHENTICATED when no valid session exists — for route handlers that require login. */
export async function requireCurrentSession(): Promise<CurrentSession> {
  const session = await getCurrentSession();
  if (!session) {
    throw new PlatformError("UNAUTHENTICATED", "You must be signed in to do that.");
  }
  return session;
}
