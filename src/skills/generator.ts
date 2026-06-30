import { nowIso } from "../utils/id.js";
import { newSkillRecord } from "./registry.js";
import type { Skill, SkillCandidate } from "./types.js";

/**
 * Skill Generator — produces a fresh Skill record from a candidate when
 * discovery returned nothing. Newly generated skills land in the registry as
 * `registered` (not yet validated or installed) so the lifecycle stages can
 * gate them downstream.
 */
export class SkillGenerator {
  generate(candidate: SkillCandidate): Skill {
    const isGenerated = candidate.source === "generated";
    return newSkillRecord({
      name: candidate.name,
      description: candidate.description,
      version: candidate.version ?? "0.1.0",
      source: isGenerated ? "generated" : candidate.source,
      uri: candidate.uri,
      capabilities: candidate.capabilities ?? [],
      tools: [],
      dependencies: [],
      metadata: { generated: isGenerated, generatedAt: nowIso() },
    });
  }
}
