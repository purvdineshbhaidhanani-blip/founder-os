import { paginate } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { withinLimit } from "@founder-os/platform/billing";
import { getPayrollAuditDb } from "../db.js";
import type { z } from "zod";
import type { createCompanySchema, listCompaniesQuerySchema } from "../validation/companies.js";

type CreateCompanyInput = z.infer<typeof createCompanySchema>;
type ListCompaniesQuery = z.infer<typeof listCompaniesQuerySchema>;

export async function createCompany(params: { organizationId: string; input: CreateCompanyInput }) {
  const db = getPayrollAuditDb();

  const limitCheck = await withinLimit(params.organizationId, "companies");
  const currentCount = await db.company.count({ where: { organizationId: params.organizationId } });
  if (!limitCheck.allowed || (limitCheck.limit !== null && currentCount >= limitCheck.limit)) {
    throw new PlatformError("UNAUTHORIZED", `You've reached your plan's limit of ${limitCheck.limit} compan${limitCheck.limit === 1 ? "y" : "ies"}. Upgrade your plan to add more.`);
  }

  return db.company.create({ data: { organizationId: params.organizationId, name: params.input.name } });
}

export async function listCompanies(params: { organizationId: string; query: ListCompaniesQuery }) {
  const db = getPayrollAuditDb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.company.findMany({
        where: { organizationId: params.organizationId },
        orderBy: { createdAt: "desc" },
        ...args,
      }),
  });
}

export async function getCompany(params: { organizationId: string; companyId: string }) {
  const db = getPayrollAuditDb();
  return db.company.findFirst({ where: { id: params.companyId, organizationId: params.organizationId } });
}
