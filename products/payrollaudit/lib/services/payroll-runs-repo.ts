import { paginate } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { withinLimit, incrementUsage } from "@founder-os/platform/billing";
import { getPayrollAuditDb } from "../db.js";
import { getCompany } from "./companies-repo.js";
import { computeComplianceScore, validatePayslipLine } from "./payroll-engine.js";
import type { z } from "zod";
import type { createPayrollRunSchema, listPayrollRunsQuerySchema } from "../validation/payroll-runs.js";

type CreatePayrollRunInput = z.infer<typeof createPayrollRunSchema>;
type ListPayrollRunsQuery = z.infer<typeof listPayrollRunsQuerySchema>;

/**
 * Imports a payroll run (payslip lines supplied by the caller, mirroring
 * an export from existing payroll software) and validates every line
 * against expected salary/tax/attendance/overtime rules, persisting
 * findings, per docs/PRODUCT_IDENTITY.md §7 "Payroll validation" and
 * §18's Must-Have feature set. Phase 1 takes the export directly from
 * the caller rather than a live payroll-system connector, which requires
 * credentials not available until Phase 2.
 */
export async function createPayrollRun(params: { organizationId: string; triggeredByUserId: string; input: CreatePayrollRunInput }) {
  const db = getPayrollAuditDb();

  const limitCheck = await withinLimit(params.organizationId, "payroll_runs_monthly");
  if (!limitCheck.allowed) {
    throw new PlatformError("UNAUTHORIZED", `You've reached your plan's limit of ${limitCheck.limit} payroll run(s) this billing period. Upgrade your plan to run more.`);
  }

  const company = await getCompany({ organizationId: params.organizationId, companyId: params.input.companyId });
  if (!company) throw new PlatformError("NOT_FOUND", "Company not found.");

  const employeeIds = params.input.payslipLines.map((l) => l.employeeId);
  const employees = await db.employee.findMany({ where: { id: { in: employeeIds }, companyId: company.id } });
  const employeeById = new Map(employees.map((e) => [e.id, e]));
  for (const employeeId of employeeIds) {
    if (!employeeById.has(employeeId)) {
      throw new PlatformError("VALIDATION_ERROR", `Employee ${employeeId} was not found in this company.`);
    }
  }

  const payrollRun = await db.payrollRun.create({
    data: {
      organizationId: params.organizationId,
      companyId: company.id,
      triggeredByUserId: params.triggeredByUserId,
      periodStart: params.input.periodStart,
      periodEnd: params.input.periodEnd,
      status: "completed",
    },
  });

  const findingCandidates: { employeeId: string; ruleId: string; category: string; severity: string; title: string; description: string }[] = [];

  await db.payslipLine.createMany({
    data: params.input.payslipLines.map((line) => ({
      organizationId: params.organizationId,
      payrollRunId: payrollRun.id,
      employeeId: line.employeeId,
      regularHours: line.regularHours,
      overtimeHours: line.overtimeHours,
      grossPayCents: line.grossPayCents,
      taxWithheldCents: line.taxWithheldCents,
      netPayCents: line.netPayCents,
      attendanceHoursReported: line.attendanceHoursReported ?? null,
    })),
  });

  for (const line of params.input.payslipLines) {
    const employee = employeeById.get(line.employeeId)!;
    const findings = validatePayslipLine(
      {
        payType: employee.payType as "hourly" | "salaried",
        hourlyRateCents: employee.hourlyRateCents,
        annualSalaryCents: employee.annualSalaryCents,
        payPeriodsPerYear: employee.payPeriodsPerYear,
      },
      {
        regularHours: line.regularHours,
        overtimeHours: line.overtimeHours,
        grossPayCents: line.grossPayCents,
        taxWithheldCents: line.taxWithheldCents,
        netPayCents: line.netPayCents,
        attendanceHoursReported: line.attendanceHoursReported ?? null,
      },
    );
    for (const finding of findings) {
      findingCandidates.push({ employeeId: line.employeeId, ...finding });
    }
  }

  if (findingCandidates.length > 0) {
    await db.finding.createMany({
      data: findingCandidates.map((f) => ({
        organizationId: params.organizationId,
        payrollRunId: payrollRun.id,
        employeeId: f.employeeId,
        ruleId: f.ruleId,
        category: f.category,
        severity: f.severity,
        title: f.title,
        description: f.description,
      })),
    });
  }

  const complianceScore = computeComplianceScore(findingCandidates);

  await incrementUsage({ organizationId: params.organizationId, metricKey: "payroll_runs_monthly", amount: 1 });

  return db.payrollRun.update({
    where: { id: payrollRun.id },
    data: { complianceScore, completedAt: new Date() },
  });
}

export async function listPayrollRuns(params: { organizationId: string; query: ListPayrollRunsQuery }) {
  const db = getPayrollAuditDb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.payrollRun.findMany({
        where: {
          organizationId: params.organizationId,
          ...(params.query.companyId ? { companyId: params.query.companyId } : {}),
        },
        include: { company: true },
        orderBy: { startedAt: "desc" },
        ...args,
      }),
  });
}

export async function getPayrollRun(params: { organizationId: string; payrollRunId: string }) {
  const db = getPayrollAuditDb();
  return db.payrollRun.findFirst({
    where: { id: params.payrollRunId, organizationId: params.organizationId },
    include: {
      company: true,
      payslipLines: { include: { employee: true } },
      findings: { include: { employee: true }, orderBy: { severity: "asc" } },
    },
  });
}
