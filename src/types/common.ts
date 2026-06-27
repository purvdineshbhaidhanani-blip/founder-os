/**
 * Primitive types shared across every layer of the factory (blueprint, generator,
 * validator, registry). Keeping these in one place means a registry entry, a
 * blueprint, and a generated agent all agree on what a "status" or "tag" is.
 */

/** ISO-8601 timestamp string, e.g. `new Date().toISOString()`. */
export type Timestamp = string;

/**
 * Lifecycle status of an agent in the registry.
 *  - draft: generated but not yet promoted for general use.
 *  - active: in use, passing validation.
 *  - deprecated: superseded by a newer version, still callable.
 *  - archived: retired, kept for historical/audit purposes only.
 */
export const AGENT_STATUSES = ["draft", "active", "deprecated", "archived"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export interface Identifiable {
  id: string;
}

export interface Timestamped {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Semantic version string, e.g. `1.2.0`. Validated via `isSemver`. */
export type SemVer = string;

const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;

export function isSemVer(value: string): value is SemVer {
  return SEMVER_PATTERN.test(value);
}
