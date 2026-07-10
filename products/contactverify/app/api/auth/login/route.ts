import { z } from "zod";
import { cookies, headers } from "next/headers";
import { parseJsonBodyOrThrow } from "@founder-os/platform/api";
import { loginWithPassword } from "@founder-os/platform/auth";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { SESSION_COOKIE_NAME } from "../../../../lib/auth.js";

const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const input = await parseJsonBodyOrThrow(loginRequestSchema, request);
    const headerList = await headers();

    const result = await loginWithPassword(input, {
      ipAddress: headerList.get("x-forwarded-for") ?? undefined,
      userAgent: headerList.get("user-agent") ?? undefined,
    });

    if (result.requiresMfa) {
      return { requiresMfa: true, userId: result.userId };
    }

    if (result.session) {
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE_NAME, result.session.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: result.session.expiresAt,
        path: "/",
      });
    }

    return { requiresMfa: false, userId: result.userId };
  });
}
