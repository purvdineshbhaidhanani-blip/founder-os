import type { Timestamp } from "../../types/common.js";

export type ApprovalStatus = "pending" | "granted" | "rejected" | "expired";

export interface ApprovalRequest<T = unknown> {
  id: string;
  reason: string;
  payload: T;
  /** Optional links to runtime objects this approval is gating. */
  workflowStateId?: string;
  taskId?: string;
  requestedBy: string;
  requestedAt: Timestamp;
  expiresAt?: Timestamp;
  status: ApprovalStatus;
  decidedAt?: Timestamp;
  decidedBy?: string;
  note?: string;
}

export interface ApprovalFilter {
  status?: ApprovalStatus;
  workflowStateId?: string;
  taskId?: string;
  requestedBy?: string;
  since?: Timestamp;
}
