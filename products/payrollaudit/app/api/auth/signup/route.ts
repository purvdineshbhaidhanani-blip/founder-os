import { z } from "zod";
import { cookies, headers } from "next/headers";
import { parseJsonBodyOrThrow } from "@founder-os/platform/api";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { signUpAndOnboard } from "../../../../lib/services/onboarding.js";
import { SESSION_COOKIE_NAME } from "../../../../lib/auth.js";

const signupRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  displayName: z.string().min(1).max(120),
  organizationName: z.string().min(1).max(160),
  organizationSlug: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only."),
});

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const input = await parseJsonBodyOrThrow(signupRequestSchema, request);
    const headerList = await headers();

    const result = await signUpAndOnboard(input, {
      ipAddress: headerList.get("x-forwarded-for") ?? undefined,
      userAgent: headerList.get("user-agent") ?? undefined,
    });

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

    return { userId: result.userId, organizationId: result.organizationId, companyId: result.companyId };
  });
}
