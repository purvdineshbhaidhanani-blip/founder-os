import { nowIso } from "../utils/id.js";
import type { SkillRegistry } from "./registry.js";
import type { Skill } from "./types.js";

/**
 * Skill Lifecycle — install, validate-and-promote, deprecate, mark-broken,
 * update versions, resolve transitive dependencies, recommend by capability.
 * The Skill Marketplace is the union of (Registry × Lifecycle) — list shows
 * everything, recommend picks the best-status candidate for a need.
 */
export class SkillLifecycle {
  constructor(private registry: SkillRegistry) {}

  install(id: string): Skill {
    const skill = this.require(id);
    skill.status = "installed";
    skill.installedAt = nowIso();
    return skill;
  }

  validateAndPromote(id: string): Skill {
    const skill = this.require(id);
    skill.status = "validated";
    return skill;
  }

  deprecate(id: string): Skill {
    const skill = this.require(id);
    skill.status = "deprecated";
    return skill;
  }

  markBroken(id: string, reason?: string): Skill {
    const skill = this.require(id);
    skill.status = "broken";
    if (reason) skill.metadata = { ...skill.metadata, brokenReason: reason };
    return skill;
  }

  update(id: string, newVersion: string): Skill {
    const skill = this.require(id);
    skill.version = newVersion;
    skill.installedAt = nowIso();
    return skill;
  }

  /** Resolves transitive deps; picks the newest known version of each. */
  resolveDependencies(id: string): Skill[] {
    const root = this.require(id);
    const out: Skill[] = [];
    const seen = new Set<string>();
    const visit = (skillId: string): void => {
      if (seen.has(skillId)) return;
      seen.add(skillId);
      const skill = this.registry.get(skillId);
      if (!skill) return;
      for (const dep of skill.dependencies) {
        const candidate = this.registry.versions(dep.id)[0];
        if (candidate) {
          out.push(candidate);
          visit(candidate.id);
        }
      }
    };
    visit(root.id);
    return out;
  }

  /** Picks the best-status skill that satisfies a named capability. */
  recommend(capability: string): Skill | undefined {
    const candidates = this.registry.byCapability(capability);
    const order: Skill["status"][] = ["validated", "installed", "registered"];
    for (const status of order) {
      const found = candidates.find((s) => s.status === status);
      if (found) return found;
    }
    return undefined;
  }

  /** Record a quality observation back into the skill so future picks can rank it. */
  learn(id: string, observation: { success: boolean; durationMs?: number; note?: string }): void {
    const skill = this.require(id);
    const metric = (skill.metadata.successCount as number | undefined) ?? 0;
    const failure = (skill.metadata.failureCount as number | undefined) ?? 0;
    skill.metadata = {
      ...skill.metadata,
      successCount: metric + (observation.success ? 1 : 0),
      failureCount: failure + (observation.success ? 0 : 1),
      lastObservation: observation,
      lastObservedAt: nowIso(),
    };
  }

  private require(id: string): Skill {
    const skill = this.registry.get(id);
    if (!skill) throw new Error(`Unknown skill "${id}"`);
    return skill;
  }
}
