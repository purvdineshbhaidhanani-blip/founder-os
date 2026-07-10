import { recordAuditLogEntry } from "../audit/index.js";

/**
 * Human-approval matrix per frameworks/05-ai-framework.md: read-only AI
 * actions act freely; drafts require review before anything user-facing
 * happens; irreversible/external/costly actions require explicit
 * confirmation. This module is the shared *policy + audit trail* for that
 * matrix — not a workflow engine, since each product's "AI suggested this,
 * a human approved/rejected it" UI is necessarily product-specific (a
 * suggested CRM update looks nothing like a suggested code patch). Every
 * product's approval flow calls `recordAiActionProposed` /
 * `recordAiActionApplied` / `recordAiActionRejected` so the audit trail is
 * uniform and centrally queryable regardless of what the action was.
 */
export type AIActionRiskTier = "read_only" | "draft" | "irreversible";

export function requiresHumanApproval(tier: AIActionRiskTier): boolean {
  return tier !== "read_only";
}

export async function recordAiActionProposed(params: {
  organizationId: string;
  actorId?: string; // the AI itself has no user ID; omit for system-proposed actions
  feature: string;
  tier: AIActionRiskTier;
  targetType: string;
  targetId?: string;
  summary: string;
}): Promise<void> {
  await recordAuditLogEntry({
    organizationId: params.organizationId,
    actorId: params.actorId,
    action: `ai.action_proposed.${params.feature}`,
    targetType: params.targetType,
    targetId: params.targetId,
    metadata: { tier: params.tier, summary: params.summary },
  });
}

export async function recordAiActionApplied(params: {
  organizationId: string;
  approvedById: string;
  feature: string;
  targetType: string;
  targetId?: string;
}): Promise<void> {
  await recordAuditLogEntry({
    organizationId: params.organizationId,
    actorId: params.approvedById,
    action: `ai.action_applied.${params.feature}`,
    targetType: params.targetType,
    targetId: params.targetId,
  });
}

export async function recordAiActionRejected(params: {
  organizationId: string;
  rejectedById: string;
  feature: string;
  targetType: string;
  targetId?: string;
  reason?: string;
}): Promise<void> {
  await recordAuditLogEntry({
    organizationId: params.organizationId,
    actorId: params.rejectedById,
    action: `ai.action_rejected.${params.feature}`,
    targetType: params.targetType,
    targetId: params.targetId,
    metadata: params.reason ? { reason: params.reason } : undefined,
  });
}
