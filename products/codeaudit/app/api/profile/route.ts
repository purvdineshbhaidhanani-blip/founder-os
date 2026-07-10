import { getProfile, updateProfile, updateProfileSchema } from "@founder-os/platform/users";
import { parseJsonBodyOrThrow } from "@founder-os/platform/api";
import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireCurrentSession } from "../../../lib/auth.js";

export async function GET() {
  return withRouteHandler(async () => {
    const { userId } = await requireCurrentSession();
    return getProfile(userId);
  });
}

export async function PATCH(request: Request) {
  return withRouteHandler(async () => {
    const { userId } = await requireCurrentSession();
    const input = await parseJsonBodyOrThrow(updateProfileSchema, request);
    return updateProfile(userId, input);
  });
}
