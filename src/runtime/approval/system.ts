import { generateId, nowIso } from "../../utils/id.js";
import type { EventBus } from "../events/bus.js";
import type { WorkflowEngine } from "../workflow/engine.js";
import type { ApprovalFilter, ApprovalRequest } from "./types.js";

interface Pending {
  resolve: (req: ApprovalRequest) => void;
  timeout?: NodeJS.Timeout;
}

export interface ApprovalSystemOptions {
  bus?: EventBus;
  workflowEngine?: WorkflowEngine;
}

export interface RequestInput<T> {
  reason: string;
  payload: T;
  requestedBy: string;
  workflowStateId?: string;
  taskId?: string;
  expiresInMs?: number;
}

/**
 * Phase 10 surface — human-in-the-loop checkpoint primitive. The runtime
 * pauses an associated workflow on `request`; resumes it on `grant`. UIs or
 * CLI tools call `grant`/`reject` to deliver the decision.
 */
export class ApprovalSystem {
  private readonly requests = new Map<string, ApprovalRequest>();
  private readonly pending = new Map<string, Pending>();
  private readonly bus?: EventBus;
  private readonly workflowEngine?: WorkflowEngine;

  constructor(options: ApprovalSystemOptions = {}) {
    this.bus = options.bus;
    this.workflowEngine = options.workflowEngine;
  }

  request<T>(input: RequestInput<T>): ApprovalRequest<T> {
    const now = nowIso();
    const request: ApprovalRequest<T> = {
      id: generateId("appr"),
      reason: input.reason,
      payload: input.payload,
      workflowStateId: input.workflowStateId,
      taskId: input.taskId,
      requestedBy: input.requestedBy,
      requestedAt: now,
      expiresAt: input.expiresInMs ? new Date(Date.now() + input.expiresInMs).toISOString() : undefined,
      status: "pending",
    };
    this.requests.set(request.id, request as ApprovalRequest);

    if (input.workflowStateId && this.workflowEngine) {
      try {
        this.workflowEngine.pause(input.workflowStateId);
      } catch {
        // Workflow state may not exist (e.g. orchestrator already cleaned up); ignore.
      }
    }

    void this.bus?.publish({
      name: "approval.requested",
      source: input.requestedBy,
      correlationId: input.workflowStateId ?? input.taskId,
      payload: { id: request.id, reason: input.reason },
    });

    return request;
  }

  /**
   * Resolves when the approval is decided (granted/rejected/expired). Used
   * by workflows/agents that want to block on a human decision.
   */
  await(id: string): Promise<ApprovalRequest> {
    const existing = this.requests.get(id);
    if (!existing) return Promise.reject(new Error(`Unknown approval "${id}".`));
    if (existing.status !== "pending") return Promise.resolve(existing);

    return new Promise<ApprovalRequest>((resolve) => {
      const entry: Pending = { resolve };
      if (existing.expiresAt) {
        const delay = Date.parse(existing.expiresAt) - Date.now();
        if (delay <= 0) {
          this.expire(id);
          resolve(this.requests.get(id)!);
          return;
        }
        entry.timeout = setTimeout(() => {
          this.expire(id);
          resolve(this.requests.get(id)!);
        }, delay);
      }
      this.pending.set(id, entry);
    });
  }

  grant(id: string, by: string, note?: string): ApprovalRequest {
    return this.decide(id, "granted", by, note, "approval.granted");
  }

  reject(id: string, by: string, note?: string): ApprovalRequest {
    return this.decide(id, "rejected", by, note, "approval.rejected");
  }

  list(filter: ApprovalFilter = {}): ApprovalRequest[] {
    return [...this.requests.values()]
      .filter((req) => {
        if (filter.status && req.status !== filter.status) return false;
        if (filter.workflowStateId && req.workflowStateId !== filter.workflowStateId) return false;
        if (filter.taskId && req.taskId !== filter.taskId) return false;
        if (filter.requestedBy && req.requestedBy !== filter.requestedBy) return false;
        if (filter.since && Date.parse(req.requestedAt) < Date.parse(filter.since)) return false;
        return true;
      })
      .sort((a, b) => Date.parse(b.requestedAt) - Date.parse(a.requestedAt));
  }

  history(filter: ApprovalFilter = {}): ApprovalRequest[] {
    return this.list({ ...filter });
  }

  private decide(
    id: string,
    status: "granted" | "rejected",
    by: string,
    note: string | undefined,
    eventName: "approval.granted" | "approval.rejected",
  ): ApprovalRequest {
    const request = this.requests.get(id);
    if (!request) throw new Error(`Unknown approval "${id}".`);
    if (request.status !== "pending") return request;

    request.status = status;
    request.decidedAt = nowIso();
    request.decidedBy = by;
    request.note = note;

    if (status === "granted" && request.workflowStateId && this.workflowEngine) {
      try {
        this.workflowEngine.resume(request.workflowStateId);
      } catch {
        // Same idempotent ignore as in `request`.
      }
    }

    void this.bus?.publish({
      name: eventName,
      source: by,
      correlationId: request.workflowStateId ?? request.taskId,
      payload: { id, note },
    });

    const entry = this.pending.get(id);
    if (entry) {
      entry.timeout && clearTimeout(entry.timeout);
      this.pending.delete(id);
      entry.resolve(request);
    }
    return request;
  }

  private expire(id: string): void {
    const request = this.requests.get(id);
    if (!request || request.status !== "pending") return;
    request.status = "expired";
    request.decidedAt = nowIso();
  }
}
