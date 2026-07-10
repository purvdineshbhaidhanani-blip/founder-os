import { parseJsonBodyOrThrow } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../../lib/api-helpers.js";
import { loginEndUserSchema } from "../../../../../lib/validation/end-users.js";
import { resolveProjectByApiKey } from "../../../../../lib/services/api-keys-repo.js";
import { loginEndUser } from "../../../../../lib/services/end-users-repo.js";

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

    const input = await parseJsonBodyOrThrow(loginEndUserSchema, request);
    return loginEndUser({ projectId: project.id, sessionTtlMinutes: project.sessionTtlMinutes, input });
  });
}
