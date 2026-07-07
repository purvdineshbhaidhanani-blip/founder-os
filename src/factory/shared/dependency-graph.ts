export interface DependencyNode {
  id: string;
  dependsOn?: string[];
}

export interface DependencyIssue {
  nodeId: string;
  type: "missing-dependency" | "cycle" | "disabled-dependency";
  detail: string;
}

export interface DependencyValidation {
  valid: boolean;
  issues: DependencyIssue[];
  /** Dependency-first order — safe to install/enable/load nodes in this sequence. */
  order: string[];
}

/**
 * Generic dependency-graph validator: detects missing dependencies and
 * cycles, and produces a dependency-first topological order. Shared by the
 * Module Registry and the Extension System so there is exactly one
 * implementation of "does this set of things depend on things that exist,
 * without forming a cycle" in the factory.
 */
export function validateDependencyGraph(
  nodes: DependencyNode[],
  options: { enabledIds?: Set<string> } = {},
): DependencyValidation {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const issues: DependencyIssue[] = [];

  for (const node of nodes) {
    const nodeIsEnabled = !options.enabledIds || options.enabledIds.has(node.id);
    for (const dep of node.dependsOn ?? []) {
      if (!byId.has(dep)) {
        issues.push({
          nodeId: node.id,
          type: "missing-dependency",
          detail: `"${node.id}" depends on unknown module/extension "${dep}".`,
        });
      } else if (nodeIsEnabled && options.enabledIds && !options.enabledIds.has(dep)) {
        issues.push({
          nodeId: node.id,
          type: "disabled-dependency",
          detail: `"${node.id}" depends on "${dep}", which is not enabled.`,
        });
      }
    }
  }

  const order: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(id: string): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      issues.push({ nodeId: id, type: "cycle", detail: `Dependency cycle detected at "${id}".` });
      return;
    }
    const node = byId.get(id);
    if (!node) return;
    visiting.add(id);
    for (const dep of node.dependsOn ?? []) {
      if (byId.has(dep)) visit(dep);
    }
    visiting.delete(id);
    visited.add(id);
    order.push(id);
  }

  for (const node of nodes) visit(node.id);

  return { valid: issues.length === 0, issues, order };
}
