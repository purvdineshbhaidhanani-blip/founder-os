import type { Timestamp } from "../../types/common.js";

/**
 * Canonical event vocabulary. Other runtime layers publish these names;
 * subscribers filter on them. Strings are kept open so application code can
 * extend without modifying this file.
 */
export type RuntimeEventName =
  | "memory.updated"
  | "task.queued"
  | "task.started"
  | "task.completed"
  | "task.failed"
  | "task.cancelled"
  | "task.dead-lettered"
  | "workflow.started"
  | "workflow.checkpoint"
  | "workflow.completed"
  | "workflow.failed"
  | "workflow.resumed"
  | "workflow.rolled-back"
  | "agent.registered"
  | "agent.activated"
  | "agent.deactivated"
  | "agent.unhealthy"
  | "approval.requested"
  | "approval.granted"
  | "approval.rejected"
  | "artifact.created"
  | "artifact.updated"
  | "message.sent"
  | "execution.started"
  | "execution.completed"
  | (string & {});

export interface RuntimeEvent<T = unknown> {
  id: string;
  name: RuntimeEventName;
  timestamp: Timestamp;
  /** Producer identifier — usually an agent name or runtime module name. */
  source?: string;
  /** Ties related events together, typically a task or workflow id. */
  correlationId?: string;
  payload: T;
}

export interface EventFilter {
  name?: RuntimeEventName;
  /** Regex pattern (string) matched against event name; useful for "task.*" subscriptions. */
  namePattern?: string;
  source?: string;
  correlationId?: string;
  since?: Timestamp;
}

export type EventHandler<T = unknown> = (event: RuntimeEvent<T>) => void | Promise<void>;

export interface EventSubscription {
  id: string;
  filter: EventFilter;
  handler: EventHandler;
}
