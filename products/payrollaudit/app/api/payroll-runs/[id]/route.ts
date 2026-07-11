import { PlatformError } from "@founder-os/platform/errors";
import { withRouteHandler } from "../../../../lib/api-helpers.js";
import { requireOrganizationContext } from "../../../../lib/organization-context.js";
import { getPayrollRun } from "../../../../lib/services/payroll-runs-repo.js";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  return withRouteHandler(async () => {
    const { organizationId } = await requireOrganizationContext();
    const { id } = await params;
    const payrollRun = await getPayrollRun({ organizationId, payrollRunId: id });
    if (!payrollRun) throw new PlatformError("NOT_FOUND", "Payroll run not found.");
    return payrollRun;
  });
}
