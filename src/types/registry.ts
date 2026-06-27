import type { AgentCategory } from "../constants/categories.js";
import type { AgentStatus, Timestamp } from "./common.js";

export type RegistryAction = "created" | "updated" | "regenerated" | "deprecated" | "archived";

export interface RegistryHistoryEntry {
  version: string;
  timestamp: Timestamp;
  action: RegistryAction;
  note?: string;
}

/**
 * One row of the Agent Registry (Phase 5). This is the durable, queryable
 * record of every agent the factory has ever produced — independent of
 * whether the underlying `.claude/agents/*.md` file still exists.
 */
export interface RegistryEntry {
  id: string;
  name: string;
  displayName: string;
  category: AgentCategory;
  version: string;
  owner: string;
  description: string;
  capabilities: string[];
  dependencies: string[];
  status: AgentStatus;
  tags: string[];
  filePath: string;
  blueprintId: string;
  blueprintHash: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updateHistory: RegistryHistoryEntry[];
}

export interface Registry {
  schemaVersion: string;
  updatedAt: Timestamp;
  agents: RegistryEntry[];
}

export function emptyRegistry(schemaVersion: string): Registry {
  return { schemaVersion, updatedAt: new Date().toISOString(), agents: [] };
}
