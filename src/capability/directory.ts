import type { AgentRuntime } from "../runtime/agents/runtime.js";
import type { AgentDescriptor } from "../runtime/agents/types.js";

export interface AnalyticsSnapshot {
  averageDurationMs?: number;
  successRate?: number;
  failureCount?: number;
  costCents?: number;
  tokens?: number;
}

export interface CapabilityProfile {
  identity: { name: string; displayName: string; version: string };
  department?: string;
  role: string;
  category: string;
  skills: string[];
  capabilities: string[];
  limitations: string[];
  dependencies: string[];
  preferredCollaborators: string[];
  executionCost: { typicalCents?: number; typicalTokens?: number };
  averageDurationMs?: number;
  successRate?: number;
  failureHistoryCount: number;
  tools: string[];
  availableSkills: string[];
  version: string;
  status: string;
}

/**
 * Capability Directory — projects every agent's blueprint into a single,
 * uniform Capability Profile that downstream services (Discovery Engine, team
 * assembly, planner) can read without touching the AgentRuntime's internals.
 */
export class CapabilityDirectory {
  private analytics = new Map<string, AnalyticsSnapshot>();
  private skills = new Map<string, string[]>();
  private limitations = new Map<string, string[]>();

  constructor(private runtime: AgentRuntime) {}

  recordAnalytics(agent: string, snapshot: AnalyticsSnapshot): void {
    this.analytics.set(agent, { ...this.analytics.get(agent), ...snapshot });
  }

  attachSkills(agent: string, skillIds: string[]): void {
    this.skills.set(agent, [...new Set([...(this.skills.get(agent) ?? []), ...skillIds])]);
  }

  setLimitations(agent: string, limitations: string[]): void {
    this.limitations.set(agent, limitations);
  }

  profile(agent: string): CapabilityProfile | undefined {
    const descriptor = this.runtime.get(agent);
    if (!descriptor) return undefined;
    return this.toProfile(descriptor);
  }

  list(): CapabilityProfile[] {
    return this.runtime.list().map((descriptor) => this.toProfile(descriptor));
  }

  byDepartment(department: string): CapabilityProfile[] {
    return this.list().filter((profile) => profile.department === department);
  }

  private toProfile(descriptor: AgentDescriptor): CapabilityProfile {
    const bp = descriptor.blueprint;
    const analytics = this.analytics.get(descriptor.name) ?? {};
    const department = bp.identity.tags.find((tag) =>
      [
        "leadership",
        "engineering",
        "quality",
        "product",
        "platform",
        "intelligence",
        "market-intelligence",
        "brain",
      ].includes(tag),
    );
    return {
      identity: { name: bp.identity.name, displayName: bp.identity.displayName, version: bp.version },
      department,
      role: bp.role,
      category: bp.identity.category,
      skills: this.skills.get(descriptor.name) ?? [],
      capabilities: bp.responsibilities,
      limitations: this.limitations.get(descriptor.name) ?? bp.executionConstraints.forbiddenActions,
      dependencies: bp.communicationProtocol.collaboratesWith,
      preferredCollaborators: bp.communicationProtocol.collaboratesWith,
      executionCost: { typicalCents: analytics.costCents, typicalTokens: analytics.tokens },
      averageDurationMs: analytics.averageDurationMs,
      successRate: analytics.successRate,
      failureHistoryCount: analytics.failureCount ?? 0,
      tools: bp.allowedTools,
      availableSkills: this.skills.get(descriptor.name) ?? [],
      version: bp.version,
      status: descriptor.status,
    };
  }
}
