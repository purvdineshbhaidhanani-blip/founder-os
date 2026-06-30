import type { AgentDescriptor } from "../runtime/agents/types.js";
import type { AgentRuntime } from "../runtime/agents/runtime.js";
import { buildDepartmentBlueprint, DEPARTMENT_OWNER } from "../departments/blueprint.js";
import { MARKET_INTELLIGENCE_DEPARTMENT } from "./agents.js";

export interface LoadIntelligenceOptions {
  owner?: string;
  activate?: boolean;
}

/**
 * Wires the entire Market Intelligence Department into a live Runtime in one
 * call — same pattern as the Engineering Department (departments/integration).
 */
export function loadIntelligenceDepartment(
  runtime: AgentRuntime,
  options: LoadIntelligenceOptions = {},
): AgentDescriptor[] {
  const owner = options.owner ?? DEPARTMENT_OWNER;
  const activate = options.activate ?? true;
  const descriptors: AgentDescriptor[] = [];

  for (const spec of MARKET_INTELLIGENCE_DEPARTMENT) {
    const blueprint = buildDepartmentBlueprint(spec, owner);
    const descriptor = runtime.register(blueprint);
    if (activate) runtime.activate(blueprint.identity.name);
    descriptors.push(descriptor);
  }

  return descriptors;
}

export const MARKET_INTELLIGENCE_AGENTS: string[] = MARKET_INTELLIGENCE_DEPARTMENT.map(
  (spec) => spec.name,
);
