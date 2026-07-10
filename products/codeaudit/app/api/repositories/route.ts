import { parseJsonBodyOrThrow, parseSearchParamsOrThrow } from "@founder-os/platform/api";
import { withinLimit } from "@founder-os/platform/billing";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../lib/organization-context.js";
import { createRepositorySchema, listRepositoriesQuerySchema } from "../../../lib/validation/repositories.js";
import { countRepositories, createRepository, listRepositories } from "../../../lib/services/repositories-repo.js";

export async function GET(request: Request) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const url = new URL(request.url);
    const query = parseSearchParamsOrThrow(listRepositoriesQuerySchema, url.searchParams);
    return listRepositories({ organizationId, query });
  });
}

export async function POST(request: Request) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    const input = await parseJsonBodyOrThrow(createRepositorySchema, request);

    const limitKey = input.visibility === "public" ? "public_repos" : "private_repos";
    const limitCheck = await withinLimit(organizationId, limitKey);
    if (!limitCheck.allowed) {
      throw new PlatformError(
        "UNAUTHORIZED",
        `You've reached your plan's limit of ${limitCheck.limit} ${input.visibility} repositories. Upgrade your plan to add more.`,
      );
    }
    const currentCount = await countRepositories({ organizationId, visibility: input.visibility });
    if (limitCheck.limit !== null && currentCount >= limitCheck.limit) {
      throw new PlatformError(
        "UNAUTHORIZED",
        `You've reached your plan's limit of ${limitCheck.limit} ${input.visibility} repositories. Upgrade your plan to add more.`,
      );
    }

    return createRepository({ organizationId, createdByUserId: userId, input });
  });
}
