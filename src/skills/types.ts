import type { Timestamp } from "../types/common.js";

export type SkillSource =
  | "internal"
  | "local"
  | "official-docs"
  | "github"
  | "mcp"
  | "npm"
  | "pypi"
  | "vendor-sdk"
  | "generated";

export type SkillStatus = "registered" | "installed" | "validated" | "deprecated" | "broken";

export interface SkillDependency {
  id: string;
  version: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  version: string;
  source: SkillSource;
  uri?: string;
  capabilities: string[];
  tools: string[];
  dependencies: SkillDependency[];
  status: SkillStatus;
  installedAt?: Timestamp;
  registeredAt: Timestamp;
  /** Free-form metadata: tags, success metrics, generated flag, etc. */
  metadata: Record<string, unknown>;
}

export interface SkillSearchQuery {
  capability?: string;
  tag?: string;
  text?: string;
  status?: SkillStatus;
}

export interface SkillCandidate {
  source: SkillSource;
  name: string;
  description: string;
  version?: string;
  uri?: string;
  capabilities?: string[];
}
