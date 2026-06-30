import type { AgentRuntime } from "../runtime/agents/runtime.js";
import type { AgentDescriptor } from "../runtime/agents/types.js";
import type { AgentAnalytics } from "../analytics/agents.js";
import type { CapabilityDirectory, CapabilityProfile } from "../capability/directory.js";

export interface DiscoveryQuery {
  capability?: string;
  department?: string;
  category?: string;
  tag?: string;
  excludeAgents?: string[];
}

export interface AgentRanking {
  agent: string;
  score: number;
  reasons: string[];
}

export interface TeamRole {
  capability: string;
  preferredDepartment?: string;
  preferredCategory?: string;
  required: boolean;
}

export interface AssembledTeam {
  assignments: Array<{ role: TeamRole; agent?: string }>;
  missingRoles: TeamRole[];
  fullyStaffed: boolean;
}

/**
 * Agent Discovery Engine — capability matching, ranking and automatic team
 * assembly. Combines blueprint metadata (via CapabilityDirectory) with
 * runtime status (AgentRuntime) and historical performance (AgentAnalytics)
 * to pick the best agent for each role.
 */
export class AgentDiscoveryEngine {
  constructor(
    private runtime: AgentRuntime,
    private directory: CapabilityDirectory,
    private analytics?: AgentAnalytics,
  ) {}

  /** Returns active, non-excluded agents that match the query, sorted by rank. */
  find(query: DiscoveryQuery): AgentRanking[] {
    const candidates = this.runtime
      .discover({
        category: query.category,
        tag: query.tag,
        capability: query.capability,
        status: "active",
      })
      .filter((descriptor) => !query.excludeAgents?.includes(descriptor.name));
    return candidates
      .map((descriptor) => this.rank(descriptor, query))
      .sort((a, b) => b.score - a.score);
  }

  /** First-choice agent for a query, or undefined if none qualifies. */
  pick(query: DiscoveryQuery): AgentDescriptor | undefined {
    const top = this.find(query)[0];
    if (!top) return undefined;
    return this.runtime.get(top.agent);
  }

  /** Returns agents in the registry but not the runtime's active set. */
  idleAgents(): AgentDescriptor[] {
    return this.runtime.list().filter((descriptor) => descriptor.status !== "active");
  }

  /** Duplicate detection: agents sharing ≥ N capabilities. */
  duplicateAgents(threshold = 3): Array<{ a: string; b: string; shared: string[] }> {
    const profiles = this.directory.list();
    const results: Array<{ a: string; b: string; shared: string[] }> = [];
    for (let i = 0; i < profiles.length; i += 1) {
      for (let j = i + 1; j < profiles.length; j += 1) {
        const a = profiles[i]!;
        const b = profiles[j]!;
        const aCaps = new Set(a.capabilities.map((c) => c.toLowerCase()));
        const shared = b.capabilities.filter((c) => aCaps.has(c.toLowerCase()));
        if (shared.length >= threshold) {
          results.push({ a: a.identity.name, b: b.identity.name, shared });
        }
      }
    }
    return results;
  }

  recommend(query: DiscoveryQuery, limit = 5): AgentRanking[] {
    return this.find(query).slice(0, limit);
  }

  /** Automatic team assembly: one agent per role, picked by rank. */
  assembleTeam(roles: TeamRole[]): AssembledTeam {
    const used = new Set<string>();
    const assignments: AssembledTeam["assignments"] = [];
    const missing: TeamRole[] = [];

    for (const role of roles) {
      const ranking = this.find({
        capability: role.capability,
        department: role.preferredDepartment,
        category: role.preferredCategory,
        excludeAgents: [...used],
      });
      const chosen = ranking[0]?.agent;
      if (chosen) {
        used.add(chosen);
        assignments.push({ role, agent: chosen });
      } else {
        assignments.push({ role, agent: undefined });
        if (role.required) missing.push(role);
      }
    }
    return { assignments, missingRoles: missing, fullyStaffed: missing.length === 0 };
  }

  private rank(descriptor: AgentDescriptor, query: DiscoveryQuery): AgentRanking {
    const profile: CapabilityProfile | undefined = this.directory.profile(descriptor.name);
    const reasons: string[] = [];
    let score = 0;

    if (query.capability) {
      const needle = query.capability.toLowerCase();
      const matches = descriptor.blueprint.responsibilities.filter((r) => r.toLowerCase().includes(needle)).length;
      if (matches > 0) {
        score += 10 * matches;
        reasons.push(`${matches} responsibility match(es) for "${query.capability}"`);
      }
    }
    if (query.department && profile?.department === query.department) {
      score += 8;
      reasons.push(`in department "${query.department}"`);
    }
    if (query.category && descriptor.category === query.category) {
      score += 5;
      reasons.push(`category match "${query.category}"`);
    }
    if (descriptor.status === "active") {
      score += 3;
      reasons.push("active");
    }

    const analytics = this.analytics?.view(descriptor.name);
    if (analytics) {
      score += Math.round(analytics.successRate * 10);
      reasons.push(`success rate ${(analytics.successRate * 100).toFixed(0)}%`);
      if (analytics.averageDurationMs && analytics.averageDurationMs < 30_000) {
        score += 2;
        reasons.push("fast historical performance");
      }
    }

    return { agent: descriptor.name, score, reasons };
  }
}
