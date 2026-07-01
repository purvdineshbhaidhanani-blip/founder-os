import type { AgentRuntime } from "../runtime/agents/runtime.js";
import type { AgentDescriptor } from "../runtime/agents/types.js";
import { APP_GENERATION_DEPARTMENT } from "./app-generation.js";
import { buildDepartmentBlueprint, DEPARTMENT_OWNER } from "./blueprint.js";
import type { LoadDepartmentOptions } from "./integration.js";

/**
 * Wires the entire App Generation Department into a live Runtime in one
 * call. These 8 agents transform a Product Discovery Package into a
 * production-ready application: system architecture, frontend, backend,
 * database, AI integration, implementation, QA, and deployment.
 */
export function loadAppGenerationDepartment(
  runtime: AgentRuntime,
  options: LoadDepartmentOptions = {},
): AgentDescriptor[] {
  const owner = options.owner ?? DEPARTMENT_OWNER;
  const activate = options.activate ?? true;
  const descriptors: AgentDescriptor[] = [];

  for (const spec of APP_GENERATION_DEPARTMENT) {
    const blueprint = buildDepartmentBlueprint(spec, owner);
    const descriptor = runtime.register(blueprint);
    if (activate) runtime.activate(blueprint.identity.name);
    descriptors.push(descriptor);
  }

  return descriptors;
}

export const APP_GENERATION_DEPARTMENT_AGENTS: string[] = APP_GENERATION_DEPARTMENT.map((spec) => spec.name);
