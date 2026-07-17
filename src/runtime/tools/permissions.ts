import type { ApprovalSystem } from "../approval/system.js";
import type { ToolDefinition, ToolExecutionContext } from "./types.js";

/**
 * Tool permission evaluation. Five modes:
 *
 *  - "allowed"        — runs unconditionally.
 *  - "denied"         — never runs.
 *  - "ask-user"        — gates on the EXISTING `ApprovalSystem` (Phase 10,
 *                        `src/runtime/approval`). Reused verbatim: this
 *                        module creates no new human-in-the-loop mechanism,
 *                        it only calls `request()` + awaits `.await(id)`.
 *                        Requires an `ApprovalSystem` to be supplied; if
 *                        none is configured, "ask-user" degrades to a denial
 *                        (never silently auto-approved).
 *  - "read-only"       — runs only if the tool's own capability tags contain
 *                        no "write"/"execute"/"network-write" mutation tag.
 *                        A tool that mutates state and is configured
 *                        "read-only" is denied, not silently downgraded.
 *  - "workspace-only"  — passes through as allowed; the actual path
 *                        confinement is enforced by `sandbox.ts` INSIDE each
 *                        filesystem/shell/git tool (the only place that
 *                        knows what a "path" means for that tool). This
 *                        mode documents intent; enforcement lives with the
 *                        tool body, never faked here.
 */

const MUTATING_CAPABILITY_TAGS = new Set(["write", "execute", "network-write", "delete"]);

export interface PermissionDecision {
  allowed: boolean;
  reason: string;
  /** True only when an "ask-user" gate was actually exercised. */
  askedUser?: boolean;
}

export interface PermissionEvaluatorOptions {
  approvals?: ApprovalSystem;
  /** How long an "ask-user" gate waits for a decision before treating it as denied. */
  askUserTimeoutMs?: number;
}

export class PermissionEvaluator {
  private readonly approvals?: ApprovalSystem;
  private readonly askUserTimeoutMs: number;

  constructor(options: PermissionEvaluatorOptions = {}) {
    this.approvals = options.approvals;
    this.askUserTimeoutMs = options.askUserTimeoutMs ?? 300_000;
  }

  async evaluate(tool: ToolDefinition, context: ToolExecutionContext): Promise<PermissionDecision> {
    const { mode, reason } = tool.permission;

    if (mode === "denied") {
      return { allowed: false, reason: `Tool "${tool.id}" is configured "denied": ${reason}` };
    }

    if (mode === "allowed" || mode === "workspace-only") {
      return { allowed: true, reason: mode === "workspace-only" ? "workspace-only (enforced by the tool's own sandbox check)" : "allowed" };
    }

    if (mode === "read-only") {
      const mutates = tool.capabilities.some((cap) => MUTATING_CAPABILITY_TAGS.has(cap));
      if (mutates) {
        return {
          allowed: false,
          reason: `Tool "${tool.id}" declares a mutating capability (${tool.capabilities.filter((c) => MUTATING_CAPABILITY_TAGS.has(c)).join(", ")}) and cannot run under "read-only".`,
        };
      }
      return { allowed: true, reason: "read-only (tool has no mutating capability tag)" };
    }

    // mode === "ask-user"
    if (!this.approvals) {
      return { allowed: false, reason: `Tool "${tool.id}" requires "ask-user" approval but no ApprovalSystem is configured.`, askedUser: false };
    }

    const request = this.approvals.request({
      reason: `${tool.name}: ${reason}`,
      payload: { toolId: tool.id, task: context.task, agent: context.agent },
      requestedBy: context.agent ?? "tool-executor",
      expiresInMs: this.askUserTimeoutMs,
    });
    const resolved = await this.approvals.await(request.id);

    if (resolved.status === "granted") {
      return { allowed: true, reason: `Approved by ${resolved.decidedBy ?? "operator"}.`, askedUser: true };
    }
    return {
      allowed: false,
      reason: resolved.status === "expired" ? "Approval request expired without a decision." : `Denied by ${resolved.decidedBy ?? "operator"}.`,
      askedUser: true,
    };
  }
}
