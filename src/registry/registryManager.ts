import type { AgentBlueprint } from "../types/blueprint.js";
import type { AgentStatus } from "../types/common.js";
import type { Registry, RegistryAction, RegistryEntry } from "../types/registry.js";
import { contentHash } from "../utils/hash.js";
import { generateId, nowIso } from "../utils/id.js";
import { err, ok, type Result } from "../utils/result.js";

export interface RegisterAgentInput {
  blueprint: AgentBlueprint;
  filePath: string;
  status?: AgentStatus;
}

export interface UpsertResult {
  registry: Registry;
  entry: RegistryEntry;
  /** False when the blueprint hash, status, and file path are all unchanged from the existing entry. */
  changed: boolean;
}

type DerivedFields = Omit<RegistryEntry, "id" | "createdAt" | "updatedAt" | "updateHistory">;

function deriveFields(input: RegisterAgentInput): DerivedFields {
  const { blueprint } = input;
  return {
    name: blueprint.identity.name,
    displayName: blueprint.identity.displayName,
    category: blueprint.identity.category,
    version: blueprint.version,
    owner: blueprint.identity.owner,
    description: blueprint.identity.summary,
    capabilities: blueprint.responsibilities,
    dependencies: blueprint.communicationProtocol.collaboratesWith,
    status: input.status ?? "active",
    tags: blueprint.identity.tags,
    filePath: input.filePath,
    blueprintId: blueprint.identity.name,
    blueprintHash: contentHash(blueprint),
  };
}

/**
 * Pure function: registers or updates one agent's entry in the registry.
 * Idempotent — registering the exact same blueprint twice (same content
 * hash, status, and file path) returns `changed: false` and leaves the
 * registry's `updateHistory` untouched, so re-running `generate` doesn't
 * pollute the audit trail with no-op events.
 */
export function upsertRegistryEntry(registry: Registry, input: RegisterAgentInput): UpsertResult {
  const now = nowIso();
  const desired = deriveFields(input);
  const existingIndex = registry.agents.findIndex((agent) => agent.name === desired.name);
  const existing = existingIndex >= 0 ? registry.agents[existingIndex] : undefined;

  if (!existing) {
    const entry: RegistryEntry = {
      id: generateId("agent"),
      ...desired,
      createdAt: now,
      updatedAt: now,
      updateHistory: [{ version: desired.version, timestamp: now, action: "created" }],
    };
    return {
      registry: { ...registry, agents: [...registry.agents, entry], updatedAt: now },
      entry,
      changed: true,
    };
  }

  const isUnchanged =
    existing.blueprintHash === desired.blueprintHash &&
    existing.status === desired.status &&
    existing.filePath === desired.filePath;

  if (isUnchanged) {
    return { registry, entry: existing, changed: false };
  }

  const action: RegistryAction = existing.blueprintHash !== desired.blueprintHash ? "regenerated" : "updated";
  const entry: RegistryEntry = {
    ...existing,
    ...desired,
    updatedAt: now,
    updateHistory: [...existing.updateHistory, { version: desired.version, timestamp: now, action }],
  };
  const agents = registry.agents.map((agent, index) => (index === existingIndex ? entry : agent));
  return { registry: { ...registry, agents, updatedAt: now }, entry, changed: true };
}

export function findByName(registry: Registry, name: string): RegistryEntry | undefined {
  return registry.agents.find((agent) => agent.name === name);
}

export interface AgentFilter {
  category?: string;
  status?: AgentStatus;
  tag?: string;
  owner?: string;
}

export function listAgents(registry: Registry, filter: AgentFilter = {}): RegistryEntry[] {
  return registry.agents.filter((agent) => {
    if (filter.category && agent.category !== filter.category) return false;
    if (filter.status && agent.status !== filter.status) return false;
    if (filter.owner && agent.owner !== filter.owner) return false;
    if (filter.tag && !agent.tags.includes(filter.tag)) return false;
    return true;
  });
}

/** Transitions an agent to a new lifecycle status (e.g. deprecate/archive), recording the reason in history. */
export function setAgentStatus(
  registry: Registry,
  name: string,
  status: AgentStatus,
  note?: string,
): Result<Registry, string> {
  const index = registry.agents.findIndex((agent) => agent.name === name);
  if (index === -1) {
    return err(`No registry entry named "${name}".`);
  }

  const existing = registry.agents[index]!;
  if (existing.status === status) {
    return ok(registry);
  }

  const now = nowIso();
  const action: RegistryAction = status === "deprecated" ? "deprecated" : status === "archived" ? "archived" : "updated";
  const entry: RegistryEntry = {
    ...existing,
    status,
    updatedAt: now,
    updateHistory: [...existing.updateHistory, { version: existing.version, timestamp: now, action, note }],
  };

  const agents = registry.agents.map((agent, i) => (i === index ? entry : agent));
  return ok({ ...registry, agents, updatedAt: now });
}

/** Detects two distinct agents declaring near-duplicate capability sets — a registry-wide cross-check. */
export function findOverlappingCapabilities(
  registry: Registry,
  threshold = 0.8,
): Array<{ a: string; b: string; overlap: number }> {
  const results: Array<{ a: string; b: string; overlap: number }> = [];
  const entries = registry.agents.filter((agent) => agent.status === "active");

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const a = entries[i]!;
      const b = entries[j]!;
      const setA = new Set(a.capabilities.map((item) => item.toLowerCase().trim()));
      const setB = new Set(b.capabilities.map((item) => item.toLowerCase().trim()));
      if (setA.size === 0 || setB.size === 0) continue;
      const intersection = [...setA].filter((item) => setB.has(item)).length;
      const union = new Set([...setA, ...setB]).size;
      const overlap = union === 0 ? 0 : intersection / union;
      if (overlap >= threshold) {
        results.push({ a: a.name, b: b.name, overlap });
      }
    }
  }

  return results;
}
