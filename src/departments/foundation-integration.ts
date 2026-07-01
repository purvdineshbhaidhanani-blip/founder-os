import type { AgentRuntime } from "../runtime/agents/runtime.js";
import type { AgentDescriptor } from "../runtime/agents/types.js";
import { FOUNDATION_DEPARTMENT } from "./foundation.js";
import { buildDepartmentBlueprint, DEPARTMENT_OWNER } from "./blueprint.js";
import type { LoadDepartmentOptions } from "./integration.js";

/**
 * Wires the entire Foundation Layer into a live Runtime in one call.
 * The 16 foundation agents form the operational backbone of the factory:
 * orchestration, generation, registry, workflow, memory, context, knowledge,
 * requirements, project management, planning, decisions, prompt optimization,
 * quality control, logging, reporting and configuration.
 */
export function loadFoundationDepartment(
  runtime: AgentRuntime,
  options: LoadDepartmentOptions = {},
): AgentDescriptor[] {
  const owner = options.owner ?? DEPARTMENT_OWNER;
  const activate = options.activate ?? true;
  const descriptors: AgentDescriptor[] = [];

  for (const spec of FOUNDATION_DEPARTMENT) {
    const blueprint = buildDepartmentBlueprint(spec, owner);
    const descriptor = runtime.register(blueprint);
    if (activate) runtime.activate(blueprint.identity.name);
    descriptors.push(descriptor);
  }

  return descriptors;
}

export const FOUNDATION_DEPARTMENT_AGENTS: string[] = FOUNDATION_DEPARTMENT.map((spec) => spec.name);
