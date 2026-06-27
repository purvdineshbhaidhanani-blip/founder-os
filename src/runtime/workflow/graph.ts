import type { WorkflowDefinition, WorkflowNode } from "./types.js";

/** Adjacency list for a workflow DAG, plus reverse edges for dependency lookup. */
export interface WorkflowGraph {
  nodesById: Map<string, WorkflowNode>;
  successors: Map<string, string[]>;
  predecessors: Map<string, string[]>;
  roots: string[];
}

export function buildGraph(def: WorkflowDefinition): WorkflowGraph {
  const nodesById = new Map<string, WorkflowNode>();
  for (const node of def.nodes) {
    if (nodesById.has(node.id)) throw new Error(`Duplicate workflow node id "${node.id}".`);
    nodesById.set(node.id, node);
  }

  const successors = new Map<string, string[]>();
  const predecessors = new Map<string, string[]>();
  for (const node of def.nodes) {
    successors.set(node.id, []);
    predecessors.set(node.id, [...(node.dependsOn ?? [])]);
  }
  for (const node of def.nodes) {
    for (const depId of node.dependsOn ?? []) {
      if (!nodesById.has(depId)) {
        throw new Error(`Node "${node.id}" depends on unknown node "${depId}".`);
      }
      successors.get(depId)!.push(node.id);
    }
  }

  detectCycle(def, predecessors);

  const roots = def.nodes.filter((node) => (node.dependsOn ?? []).length === 0).map((node) => node.id);
  return { nodesById, successors, predecessors, roots };
}

function detectCycle(def: WorkflowDefinition, predecessors: Map<string, string[]>): void {
  const remaining = new Map(predecessors);
  const queue: string[] = [];
  for (const [id, deps] of remaining) if (deps.length === 0) queue.push(id);

  let visited = 0;
  while (queue.length > 0) {
    const id = queue.shift()!;
    visited += 1;
    for (const node of def.nodes) {
      const deps = remaining.get(node.id);
      if (!deps) continue;
      const filtered = deps.filter((dep) => dep !== id);
      if (filtered.length !== deps.length) remaining.set(node.id, filtered);
      if (filtered.length === 0 && deps.length > 0) queue.push(node.id);
    }
  }
  if (visited !== def.nodes.length) {
    throw new Error("Workflow contains a cycle; nodes form a non-DAG.");
  }
}
