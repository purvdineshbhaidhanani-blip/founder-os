import { paginate } from "@founder-os/platform/api";
import { incrementUsage, withinLimit } from "@founder-os/platform/billing";
import { PlatformError } from "@founder-os/platform/errors";
import { getCodeAuditDb } from "../db.js";
import { computeHealthScore, scanFiles } from "./scanner.js";
import type { z } from "zod";
import type { createScanSchema, listScansQuerySchema } from "../validation/scans.js";

type CreateScanInput = z.infer<typeof createScanSchema>;
type ListScansQuery = z.infer<typeof listScansQuerySchema>;

/**
 * Runs the scanner over a submitted file batch and persists a Scan +
 * its Findings, per products/codeaudit/docs/PRODUCT_IDENTITY.md §7
 * "PR-integrated code scanning." Phase 1 takes files directly from the
 * caller (paste/upload) rather than a live GitHub PR webhook, since that
 * requires a GitHub App credential not available until Phase 2 — the
 * scan engine and findings pipeline are otherwise identical either way.
 */
export async function createScan(params: { organizationId: string; triggeredByUserId: string; input: CreateScanInput }) {
  const db = getCodeAuditDb();

  const prScanCheck = await withinLimit(params.organizationId, "pr_scans_monthly");
  if (!prScanCheck.allowed) {
    throw new PlatformError("UNAUTHORIZED", `You've reached your plan's limit of ${prScanCheck.limit} scans this billing period. Upgrade your plan to scan more.`);
  }
  const filesCheck = await withinLimit(params.organizationId, "files_scanned_monthly");
  if (filesCheck.limit !== null && filesCheck.limit !== undefined) {
    const projected = filesCheck.current + params.input.files.length;
    if (projected > filesCheck.limit) {
      throw new PlatformError("UNAUTHORIZED", `This scan would exceed your plan's limit of ${filesCheck.limit} files scanned this billing period. Upgrade your plan to scan more.`);
    }
  }

  const scan = await db.scan.create({
    data: {
      organizationId: params.organizationId,
      repositoryId: params.input.repositoryId,
      triggeredByUserId: params.triggeredByUserId,
      status: "running",
      filesScanned: params.input.files.length,
    },
  });

  const candidates = scanFiles(params.input.files);
  if (candidates.length > 0) {
    await db.finding.createMany({
      data: candidates.map((candidate) => ({
        organizationId: params.organizationId,
        scanId: scan.id,
        repositoryId: params.input.repositoryId,
        filePath: candidate.filePath,
        line: candidate.line,
        ruleId: candidate.ruleId,
        category: candidate.category,
        severity: candidate.severity,
        cwe: candidate.cwe,
        title: candidate.title,
        description: candidate.description,
        snippet: candidate.snippet,
        effortMinutes: candidate.effortMinutes,
      })),
    });
  }

  const healthScore = computeHealthScore(candidates);
  const completed = await db.scan.update({
    where: { id: scan.id },
    data: { status: "completed", healthScore, completedAt: new Date() },
  });

  await incrementUsage({ organizationId: params.organizationId, metricKey: "pr_scans_monthly", amount: 1 });
  await incrementUsage({ organizationId: params.organizationId, metricKey: "files_scanned_monthly", amount: params.input.files.length });

  return completed;
}

export async function listScans(params: { organizationId: string; query: ListScansQuery }) {
  const db = getCodeAuditDb();
  return paginate({
    cursor: params.query.cursor,
    limit: params.query.limit,
    findMany: (args) =>
      db.scan.findMany({
        where: {
          organizationId: params.organizationId,
          ...(params.query.repositoryId ? { repositoryId: params.query.repositoryId } : {}),
        },
        include: { repository: true },
        orderBy: { startedAt: "desc" },
        ...args,
      }),
  });
}

export async function getScan(params: { organizationId: string; scanId: string }) {
  const db = getCodeAuditDb();
  return db.scan.findFirst({
    where: { id: params.scanId, organizationId: params.organizationId },
    include: { repository: true, findings: { orderBy: { severity: "asc" } } },
  });
}
