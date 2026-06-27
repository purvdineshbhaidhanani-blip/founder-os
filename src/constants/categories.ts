/**
 * Canonical agent categories. Every template in the Template Library (Phase 6)
 * maps to exactly one of these, and every blueprint declares one via
 * `identity.category`. Keep this list in sync with `src/templates/index.ts`.
 */
export const AGENT_CATEGORIES = [
  "engineering",
  "planning",
  "documentation",
  "review",
  "qa",
  "devops",
  "research",
  "architecture",
] as const;

export type AgentCategory = (typeof AGENT_CATEGORIES)[number];

export function isAgentCategory(value: string): value is AgentCategory {
  return (AGENT_CATEGORIES as readonly string[]).includes(value);
}
