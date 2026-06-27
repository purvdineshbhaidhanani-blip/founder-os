import type { AgentBlueprint, IoField } from "../../types/blueprint.js";
import type { Timestamp } from "../../types/common.js";

export type AgentRuntimeStatus = "registered" | "active" | "inactive" | "unhealthy";

export interface AgentDescriptor {
  name: string;
  category: string;
  blueprint: AgentBlueprint;
  status: AgentRuntimeStatus;
  registeredAt: Timestamp;
  activatedAt?: Timestamp;
  deactivatedAt?: Timestamp;
  lastHeartbeat?: Timestamp;
  health?: HealthSnapshot;
}

export interface HealthSnapshot {
  ok: boolean;
  message?: string;
  reportedAt: Timestamp;
}

/**
 * Concrete typed view of what an agent expects/returns + the tools it may use.
 * Other runtime layers (orchestrator, execution engine) read this contract
 * before assigning work, so a bad assignment fails before the agent runs.
 */
export interface ExecutionContract {
  agentName: string;
  inputs: IoField[];
  outputs: IoField[];
  allowedTools: string[];
  permissions: AgentBlueprint["permissions"];
  executionConstraints: AgentBlueprint["executionConstraints"];
}

export interface AgentQuery {
  category?: string;
  status?: AgentRuntimeStatus;
  tag?: string;
  /** Substring match on responsibilities / role / displayName / summary. */
  capability?: string;
  /** Filter by collaboratesWith link. */
  dependsOn?: string;
}
