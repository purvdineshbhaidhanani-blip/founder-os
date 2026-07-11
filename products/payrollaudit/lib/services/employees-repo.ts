import { paginate } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { withinLimit } from "@founder-os/platform/billing";
import { getPayrollAuditDb } from "../db.js";
import { getCompany } from "./companies-repo.js";
import type { z } from "zod";
import type { createEmployeeSchema, listEmployeesQuerySchema } from "../validation/employees.js";

type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;

/** Employee headcount limit per docs/PRODUCT_IDENTITY.md §22 `withinLimit("employees", org)` — a single org-wide cap across all of that organization's companies, not per company. */
export async function createEmployee(params: { organizationId: string; input: CreateEmployeeInput }) {
  const db = getPayrollAuditDb();

  const company = await getCompany({ organizationId: params.organizationId, companyId: params.input.companyId });
  if (!company) throw new PlatformError("NOT_FOUND", "Company not found.");

  const limitCheck = await withinLimit(params.organizationId, "employees");
  const currentCount = await db.employee.count({ where: { organizationId: params.organizationId } });
  if (!limitCheck.allowed || (limitCheck.limit !== null && currentCount >= limitCheck.limit)) {
    throw new PlatformError("UNAUTHORIZED", `You've reached your plan's limit of ${limitCheck.limit} employees. Upgrade your plan to add more.`);
  }

  return db.employee.create({
    data: {
      organizationId: params.organizationId,
      companyId: params.input.companyId,
      employeeCode: params.input.employeeCode,
      fullName: params.input.fullName,
      payType: params.input.payType,
      hourlyRateCents: params.input.hourlyRateCents ?? null,
      annualSalaryCents: params.input.annualSalaryCents ?? null,
      payPeriodsPerYear: params.input.payPeriodsPerYear,
    },
  });
}

export async function listEmployees(params: { organizationId: string; query: ListEmployeesQuery }) {
  const db = getPayrollAuditDb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.employee.findMany({
        where: {
          organizationId: params.organizationId,
          ...(params.query.companyId ? { companyId: params.query.companyId } : {}),
        },
        include: { company: true },
        orderBy: { createdAt: "desc" },
        ...args,
      }),
  });
}

export async function getEmployee(params: { organizationId: string; employeeId: string }) {
  const db = getPayrollAuditDb();
  return db.employee.findFirst({ where: { id: params.employeeId, organizationId: params.organizationId }, include: { company: true } });
}
