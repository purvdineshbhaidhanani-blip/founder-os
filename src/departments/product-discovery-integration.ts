import type { AgentRuntime } from "../runtime/agents/runtime.js";
import type { AgentDescriptor } from "../runtime/agents/types.js";
import { PRODUCT_DISCOVERY_DEPARTMENT } from "./product-discovery.js";
import { buildDepartmentBlueprint, DEPARTMENT_OWNER } from "./blueprint.js";
import type { LoadDepartmentOptions } from "./integration.js";

export function loadProductDiscoveryDepartment(
  runtime: AgentRuntime,
  options: LoadDepartmentOptions = {},
): AgentDescriptor[] {
  const owner = options.owner ?? DEPARTMENT_OWNER;
  const activate = options.activate ?? true;
  const descriptors: AgentDescriptor[] = [];

  for (const spec of PRODUCT_DISCOVERY_DEPARTMENT) {
    const blueprint = buildDepartmentBlueprint(spec, owner);
    const descriptor = runtime.register(blueprint);
    if (activate) runtime.activate(blueprint.identity.name);
    descriptors.push(descriptor);
  }

  return descriptors;
}

export const PRODUCT_DISCOVERY_DEPARTMENT_AGENTS: string[] = PRODUCT_DISCOVERY_DEPARTMENT.map((spec) => spec.name);
