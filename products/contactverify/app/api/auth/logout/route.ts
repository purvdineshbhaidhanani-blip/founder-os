import { cookies } from "next/headers";
import { revokeSession } from "@founder-os/platform/auth";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { getCurrentSession, SESSION_COOKIE_NAME } from "../../../../lib/auth.js";

export async function POST() {
  return withRouteHandler(async () => {
    const session = await getCurrentSession();
    if (session) {
      await revokeSession(session.sessionId);
    }
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    return { loggedOut: true };
  });
}
