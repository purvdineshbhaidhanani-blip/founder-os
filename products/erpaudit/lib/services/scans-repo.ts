import { paginate } from "@founder-os/platform/api";
import { PlatformError } from "@founder-os/platform/errors";
import { withinLimit } from "@founder-os/platform/billing";
import { getERPAuditDb } from "../db.js";
import { detectSodViolations } from "./sod-engine.js";
import { computeComplianceScore, evaluateConfigRules } from "./config-rules.js";
import type { z } from "zod";
import type { createScanSchema, listScansQuerySchema } from "../validation/scans.js";

type CreateScanInput = z.infer<typeof createScanSchema>;
type ListScansQuery = z.infer<typeof listScansQuerySchema>;

/**
 * Imports a configuration export (role assignments + config settings)
 * for an instance and runs both the SoD and config-rule engines,
 * persisting findings, per products/erpaudit/docs/PRODUCT_IDENTITY.md
 * §7 "ERP configuration scanner" and "Compliance checker." Phase 1 takes
 * the export directly from the caller (paste/upload) rather than a live
 * ERP connector, which requires credentials not available until Phase 2.
 */
export async function createScan(params: { organizationId: string; triggeredByUserId: string; input: CreateScanInput }) {
  const db = getERPAuditDb();

  const limitCheck = await withinLimit(params.organizationId, "configuration_scans_monthly");
  if (!limitCheck.allowed) {
    throw new PlatformError("UNAUTHORIZED", `You've reached your plan's limit of ${limitCheck.limit} configuration scans this billing period. Upgrade your plan to scan more.`);
  }

  const instance = await db.erpInstance.findFirst({ where: { id: params.input.instanceId, organizationId: params.organizationId } });
  if (!instance) {
    throw new PlatformError("NOT_FOUND", "ERP instance not found.");
  }

  const scan = await db.scan.create({
    data: { organizationId: params.organizationId, instanceId: instance.id, triggeredByUserId: params.triggeredByUserId, status: "running" },
  });

  for (const assignment of params.input.roleAssignments) {
    await db.roleAssignment.upsert({
      where: { instanceId_userIdentifier_permission: { instanceId: instance.id, userIdentifier: assignment.userIdentifier, permission: assignment.permission } },
      create: { organizationId: params.organizationId, instanceId: instance.id, userIdentifier: assignment.userIdentifier, permission: assignment.permission },
      update: {},
    });
  }
  for (const setting of params.input.configSettings) {
    await db.configSetting.upsert({
      where: { instanceId_key: { instanceId: instance.id, key: setting.key } },
      create: { organizationId: params.organizationId, instanceId: instance.id, key: setting.key, value: setting.value },
      update: { value: setting.value },
    });
  }

  const allAssignments = await db.roleAssignment.findMany({ where: { instanceId: instance.id } });
  const allSettings = await db.configSetting.findMany({ where: { instanceId: instance.id } });

  const sodViolations = detectSodViolations(allAssignments);
  const configFindings = evaluateConfigRules(allSettings);

  const candidates = [
    ...sodViolations.map((v) => ({ category: "sod_violation" as const, severity: v.severity, title: v.title, description: v.description })),
    ...configFindings.map((f) => ({ category: f.category, severity: f.severity, title: f.title, description: f.description })),
  ];

  if (candidates.length > 0) {
    await db.finding.createMany({
      data: candidates.map((c) => ({
        organizationId: params.organizationId,
        scanId: scan.id,
        instanceId: instance.id,
        category: c.category,
        severity: c.severity,
        title: c.title,
        description: c.description,
      })),
    });
  }

  const complianceScore = computeComplianceScore(candidates);
  return db.scan.update({
    where: { id: scan.id },
    data: { status: "completed", complianceScore, completedAt: new Date() },
  });
}

export async function listScans(params: { organizationId: string; query: ListScansQuery }) {
  const db = getERPAuditDb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.scan.findMany({
        where: {
          organizationId: params.organizationId,
          ...(params.query.instanceId ? { instanceId: params.query.instanceId } : {}),
        },
        include: { instance: true },
        orderBy: { startedAt: "desc" },
        ...args,
      }),
  });
}

export async function getScan(params: { organizationId: string; scanId: string }) {
  const db = getERPAuditDb();
  return db.scan.findFirst({
    where: { id: params.scanId, organizationId: params.organizationId },
    include: { instance: true, findings: { orderBy: { severity: "asc" } } },
  });
}
