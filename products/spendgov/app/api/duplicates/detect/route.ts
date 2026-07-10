import { PlatformError } from "@founder-os/platform/errors";
import { can } from "@founder-os/platform/billing";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { runDuplicateDetection, listDuplicateFindings } from "../../../../lib/services/findings-repo.js";

export async function POST() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    if (!(await can(organizationId, "detect_duplicates"))) {
      throw new PlatformError("UNAUTHORIZED", "Duplicate detection requires the Starter plan or higher.");
    }
    return runDuplicateDetection(organizationId);
  });
}

export async function GET() {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    return listDuplicateFindings(organizationId);
  });
}
