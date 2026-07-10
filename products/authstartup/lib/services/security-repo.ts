import { PlatformError } from "@founder-os/platform/errors";
import { getAuthStartupDb } from "../db.js";
import { evaluateSecurityPosture } from "./security-rules.js";

const LOOKBACK_MINUTES = 60;

/** Runs the security posture rule engine for a project and persists any new findings — idempotent per (project, rule) while a finding is still open. */
export async function runSecurityAdvisor(params: { organizationId: string; projectId: string }) {
  const db = getAuthStartupDb();
  const project = await db.project.findFirst({ where: { id: params.projectId, organizationId: params.organizationId } });
  if (!project) {
    throw new PlatformError("NOT_FOUND", "Project not found.");
  }

  const endUserCount = await db.endUser.count({ where: { projectId: project.id } });
  const since = new Date(Date.now() - LOOKBACK_MINUTES * 60 * 1000);
  const recentLoginEvents = await db.loginEvent.findMany({
    where: { projectId: project.id, occurredAt: { gte: since } },
    select: { endUserId: true, occurredAt: true, success: true },
  });

  const candidates = evaluateSecurityPosture({
    requireMfa: project.requireMfa,
    sessionTtlMinutes: project.sessionTtlMinutes,
    endUserCount,
    recentLoginEvents,
  });

  const created = [];
  for (const candidate of candidates) {
    const existingOpen = await db.securityFinding.findFirst({
      where: { projectId: project.id, ruleId: candidate.ruleId, status: "open" },
    });
    if (existingOpen) continue;

    const finding = await db.securityFinding.create({
      data: {
        organizationId: params.organizationId,
        projectId: project.id,
        ruleId: candidate.ruleId,
        severity: candidate.severity,
        title: candidate.title,
        description: candidate.description,
      },
    });
    created.push(finding);
  }

  return created;
}

export async function listSecurityFindings(params: { organizationId: string; projectId?: string }) {
  const db = getAuthStartupDb();
  return db.securityFinding.findMany({
    where: { organizationId: params.organizationId, ...(params.projectId ? { projectId: params.projectId } : {}) },
    include: { project: true, recommendation: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSecurityFinding(params: { organizationId: string; findingId: string }) {
  const db = getAuthStartupDb();
  return db.securityFinding.findFirst({
    where: { id: params.findingId, organizationId: params.organizationId },
    include: { project: true, recommendation: true },
  });
}

export async function updateFindingStatus(params: { organizationId: string; findingId: string; status: string }) {
  const db = getAuthStartupDb();
  const result = await db.securityFinding.updateMany({
    where: { id: params.findingId, organizationId: params.organizationId },
    data: { status: params.status as never },
  });
  if (result.count === 0) {
    throw new PlatformError("NOT_FOUND", "Finding not found.");
  }
  return getSecurityFinding({ organizationId: params.organizationId, findingId: params.findingId });
}
