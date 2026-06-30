import { generateId, nowIso } from "../utils/id.js";
import type { EventBus } from "../runtime/events/bus.js";
import type { Skill, SkillSearchQuery } from "./types.js";

/**
 * The central Skill Registry — also serves as the Skill Marketplace surface.
 * Every Skill ever discovered, generated, or installed lives here keyed by id.
 * Duplicate detection is performed by the discovery layer before insertion.
 */
export class SkillRegistry {
  private skills = new Map<string, Skill>();
  constructor(private bus?: EventBus) {}

  register(skill: Skill): Skill {
    this.skills.set(skill.id, skill);
    void this.bus?.publish({
      name: "skill.registered" as never,
      source: "skill-registry",
      payload: { id: skill.id, name: skill.name, version: skill.version },
    });
    return skill;
  }

  get(id: string): Skill | undefined { return this.skills.get(id); }
  list(): Skill[] { return [...this.skills.values()]; }
  byName(name: string): Skill[] { return this.list().filter((s) => s.name === name); }
  byCapability(capability: string): Skill[] {
    return this.list().filter((s) => s.capabilities.includes(capability));
  }

  search(query: SkillSearchQuery): Skill[] {
    return this.list().filter((skill) => {
      if (query.status && skill.status !== query.status) return false;
      if (query.capability && !skill.capabilities.includes(query.capability)) return false;
      if (query.tag) {
        const tags = (skill.metadata.tags as string[] | undefined) ?? [];
        if (!tags.includes(query.tag)) return false;
      }
      if (query.text) {
        const needle = query.text.toLowerCase();
        const haystack = [skill.name, skill.description, ...skill.capabilities].join(" ").toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }

  /** All versions of a named skill, newest first by semver string compare. */
  versions(name: string): Skill[] {
    return this.byName(name).sort((a, b) => b.version.localeCompare(a.version));
  }

  remove(id: string): void { this.skills.delete(id); }
}

/** Convenience constructor that fills in defaults. */
export function newSkillRecord(
  input: Omit<Skill, "id" | "registeredAt" | "status" | "metadata"> & {
    id?: string;
    status?: Skill["status"];
    metadata?: Record<string, unknown>;
  },
): Skill {
  return {
    id: input.id ?? generateId("skill"),
    name: input.name,
    description: input.description,
    version: input.version,
    source: input.source,
    uri: input.uri,
    capabilities: input.capabilities,
    tools: input.tools,
    dependencies: input.dependencies,
    status: input.status ?? "registered",
    installedAt: input.installedAt,
    registeredAt: nowIso(),
    metadata: input.metadata ?? {},
  };
}
