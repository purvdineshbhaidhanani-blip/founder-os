import type { AgentRuntime } from "../runtime/agents/runtime.js";
import type { AgentDescriptor } from "../runtime/agents/types.js";
import { ENGINEERING_DEPARTMENT } from "./engineering.js";
import { buildDepartmentBlueprint, DEPARTMENT_OWNER } from "./blueprint.js";

export interface LoadDepartmentOptions {
  owner?: string;
  /** Activate each agent after registration so the orchestrator can discover it. Default: true. */
  activate?: boolean;
}

/**
 * Wires the entire Engineering Department into a live Runtime in one call —
 * the "no manual integration later" guarantee. Each agent is registered into
 * the AgentRuntime (and activated by default), making it discoverable by the
 * Master Orchestrator's planner and addressable by every other runtime
 * service: Event Bus, Shared Memory, Context Manager, Task Queue, Workflow
 * Engine, Artifact Manager and Approval System all operate on agents by the
 * names registered here.
 *
 * The AgentRuntime is constructed with the shared Event Bus by the caller, so
 * registration/activation automatically publishes `agent.registered` /
 * `agent.activated` events — no extra plumbing required.
 */
export function loadEngineeringDepartment(
  runtime: AgentRuntime,
  options: LoadDepartmentOptions = {},
): AgentDescriptor[] {
  const owner = options.owner ?? DEPARTMENT_OWNER;
  const activate = options.activate ?? true;
  const descriptors: AgentDescriptor[] = [];

  for (const spec of ENGINEERING_DEPARTMENT) {
    const blueprint = buildDepartmentBlueprint(spec, owner);
    const descriptor = runtime.register(blueprint);
    if (activate) runtime.activate(blueprint.identity.name);
    descriptors.push(descriptor);
  }

  return descriptors;
}

/** The agent names that make up the Engineering Department, in roster order. */
export const ENGINEERING_DEPARTMENT_AGENTS: string[] = ENGINEERING_DEPARTMENT.map((spec) => spec.name);
