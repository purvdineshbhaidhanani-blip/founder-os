import { randomUUID } from "node:crypto";

/** Generates a namespaced unique id, e.g. `agent_3f9c...` or `bp_3f9c...`. */
export function generateId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
