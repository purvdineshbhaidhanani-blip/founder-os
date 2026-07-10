import { parseJsonBodyOrThrow } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../../lib/api-helpers.js";
import { registerEndUserSchema } from "../../../../../lib/validation/end-users.js";
import { resolveProjectByApiKey } from "../../../../../lib/services/api-keys-repo.js";
import { registerEndUser } from "../../../../../lib/services/end-users-repo.js";

/**
 * Public auth API per products/authstartup/docs/PRODUCT_IDENTITY.md §7
 * "Email/password authentication" — authenticated by a project API key
 * (Authorization: Bearer as_...), not a developer session cookie. This
 * is the endpoint AuthStartup's customers integrate into their own app.
 */
export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const authHeader = request.headers.get("authorization");
    const rawKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!rawKey) {
      throw new PlatformError("UNAUTHENTICATED", "Missing Authorization: Bearer <api key> header.");
    }
    const project = await resolveProjectByApiKey(rawKey);
    if (!project) {
      throw new PlatformError("UNAUTHENTICATED", "Invalid API key.");
    }

    const input = await parseJsonBodyOrThrow(registerEndUserSchema, request);
    return registerEndUser({ organizationId: project.organizationId, projectId: project.id, sessionTtlMinutes: project.sessionTtlMinutes, input });
  });
}
