import type { SkillRegistry } from "./registry.js";
import type { SkillCandidate, SkillSource } from "./types.js";

export type SkillSearcher = (query: string) => Promise<SkillCandidate[]>;

export interface SkillDiscoveryOptions {
  /** Pluggable searchers per source. If a source is missing it is skipped. */
  searchers?: Partial<Record<SkillSource, SkillSearcher>>;
}

/** Required priority — internal first, generate last (after every external miss). */
export const DEFAULT_SEARCH_ORDER: SkillSource[] = [
  "internal",
  "local",
  "official-docs",
  "github",
  "mcp",
  "npm",
  "pypi",
  "vendor-sdk",
];

/**
 * Phase 4 surface — Skill Detection + Discovery. Walks the canonical priority
 * order, stops at the first non-empty result, and (for "internal") synthesizes
 * candidates from the existing SkillRegistry so the system never generates a
 * duplicate skill when one is already known.
 */
export class SkillDiscovery {
  private searchers: Partial<Record<SkillSource, SkillSearcher>>;

  constructor(private registry: SkillRegistry, options: SkillDiscoveryOptions = {}) {
    this.searchers = {
      internal: async (q) =>
        this.registry.search({ text: q }).map((skill) => ({
          source: skill.source,
          name: skill.name,
          description: skill.description,
          version: skill.version,
          uri: skill.uri,
          capabilities: skill.capabilities,
        })),
      ...options.searchers,
    };
  }

  /** Returns the first non-empty source. `undefined` means "nothing found — generate". */
  async discover(
    query: string,
    order: SkillSource[] = DEFAULT_SEARCH_ORDER,
  ): Promise<{ source: SkillSource; candidates: SkillCandidate[] } | undefined> {
    for (const source of order) {
      const searcher = this.searchers[source];
      if (!searcher) continue;
      const candidates = await searcher(query);
      if (candidates.length > 0) return { source, candidates };
    }
    return undefined;
  }

  /** Returns true if a skill matching the candidate (name + version) already exists. */
  isDuplicate(candidate: SkillCandidate): boolean {
    return this.registry
      .byName(candidate.name)
      .some((skill) => !candidate.version || skill.version === candidate.version);
  }
}
