import { nowIso } from "../../utils/id.js";
import type { AgentBlueprint } from "../../types/blueprint.js";
import type { EventBus } from "../events/bus.js";
import type {
  AgentDescriptor,
  AgentQuery,
  AgentRuntimeStatus,
  ExecutionContract,
  HealthSnapshot,
} from "./types.js";

export interface AgentRuntimeOptions {
  bus?: EventBus;
}

/**
 * Phase 6 surface — manages the lifecycle of every agent the orchestrator
 * may call. Distinct from the on-disk Agent Registry (Phase 5 of the
 * factory): this runtime layer tracks live status, capability indices, and
 * health while a real workload is executing.
 */
export class AgentRuntime {
  private readonly agents = new Map<string, AgentDescriptor>();
  private readonly bus?: EventBus;

  constructor(options: AgentRuntimeOptions = {}) {
    this.bus = options.bus;
  }

  register(blueprint: AgentBlueprint): AgentDescriptor {
    const existing = this.agents.get(blueprint.identity.name);
    const descriptor: AgentDescriptor = {
      name: blueprint.identity.name,
      category: blueprint.identity.category,
      blueprint,
      status: existing?.status ?? "registered",
      registeredAt: existing?.registeredAt ?? nowIso(),
      activatedAt: existing?.activatedAt,
      deactivatedAt: existing?.deactivatedAt,
      lastHeartbeat: existing?.lastHeartbeat,
      health: existing?.health,
    };
    this.agents.set(descriptor.name, descriptor);
    void this.bus?.publish({
      name: "agent.registered",
      source: descriptor.name,
      payload: { name: descriptor.name, category: descriptor.category },
    });
    return descriptor;
  }

  activate(name: string): AgentDescriptor {
    const descriptor = this.require(name);
    descriptor.status = "active";
    descriptor.activatedAt = nowIso();
    void this.bus?.publish({ name: "agent.activated", source: name, payload: { name } });
    return descriptor;
  }

  deactivate(name: string): AgentDescriptor {
    const descriptor = this.require(name);
    descriptor.status = "inactive";
    descriptor.deactivatedAt = nowIso();
    void this.bus?.publish({ name: "agent.deactivated", source: name, payload: { name } });
    return descriptor;
  }

  setStatus(name: string, status: AgentRuntimeStatus): AgentDescriptor {
    const descriptor = this.require(name);
    descriptor.status = status;
    return descriptor;
  }

  get(name: string): AgentDescriptor | undefined {
    return this.agents.get(name);
  }

  discover(query: AgentQuery = {}): AgentDescriptor[] {
    const all = [...this.agents.values()];
    return all.filter((descriptor) => {
      if (query.category && descriptor.category !== query.category) return false;
      if (query.status && descriptor.status !== query.status) return false;
      if (query.tag && !descriptor.blueprint.identity.tags.includes(query.tag)) return false;
      if (query.dependsOn) {
        const collaborators = descriptor.blueprint.communicationProtocol.collaboratesWith;
        if (!collaborators.includes(query.dependsOn)) return false;
      }
      if (query.capability) {
        const needle = query.capability.toLowerCase();
        const haystack = [
          descriptor.name,
          descriptor.blueprint.identity.displayName,
          descriptor.blueprint.identity.summary,
          descriptor.blueprint.role,
          ...descriptor.blueprint.responsibilities,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }

  findByCapability(capability: string): AgentDescriptor[] {
    return this.discover({ capability });
  }

  findDependencies(name: string): AgentDescriptor[] {
    const descriptor = this.require(name);
    return descriptor.blueprint.communicationProtocol.collaboratesWith
      .map((collab) => this.agents.get(collab))
      .filter((value): value is AgentDescriptor => Boolean(value));
  }

  contract(name: string): ExecutionContract {
    const descriptor = this.require(name);
    const { blueprint } = descriptor;
    return {
      agentName: blueprint.identity.name,
      inputs: blueprint.inputs,
      outputs: blueprint.outputs,
      allowedTools: blueprint.allowedTools,
      permissions: blueprint.permissions,
      executionConstraints: blueprint.executionConstraints,
    };
  }

  heartbeat(name: string, snapshot: Omit<HealthSnapshot, "reportedAt">): AgentDescriptor {
    const descriptor = this.require(name);
    descriptor.lastHeartbeat = nowIso();
    descriptor.health = { ...snapshot, reportedAt: descriptor.lastHeartbeat };
    if (!snapshot.ok && descriptor.status !== "inactive") {
      descriptor.status = "unhealthy";
      void this.bus?.publish({
        name: "agent.unhealthy",
        source: name,
        payload: { name, message: snapshot.message },
      });
    } else if (snapshot.ok && descriptor.status === "unhealthy") {
      descriptor.status = "active";
    }
    return descriptor;
  }

  health(name: string): HealthSnapshot | undefined {
    return this.agents.get(name)?.health;
  }

  list(): AgentDescriptor[] {
    return [...this.agents.values()];
  }

  private require(name: string): AgentDescriptor {
    const descriptor = this.agents.get(name);
    if (!descriptor) throw new Error(`Unknown agent "${name}" in runtime.`);
    return descriptor;
  }
}
