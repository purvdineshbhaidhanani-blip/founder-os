import { can, consumeAiCredit } from "@founder-os/platform/billing";
import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../../lib/organization-context.js";
import { generatePayrollCopilotBrief } from "../../../../../lib/services/payroll-copilot.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { userId, organizationId } = await requireOrganizationContext();
    if (!(await can(organizationId, "use_ai_error_detection"))) {
      throw new PlatformError("UNAUTHORIZED", "AI Payroll Copilot requires an active Starter, Pro, or Enterprise plan.");
    }
    const { id } = await params;
    return consumeAiCredit(organizationId, () =>
      generatePayrollCopilotBrief({ organizationId, payrollRunId: id, requestedByUserId: userId }),
    );
  });
}
