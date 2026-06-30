import type { WorkflowDefinition, WorkflowNode } from "../runtime/workflow/types.js";

export interface TaskCost {
  durationMs: number;
  cents?: number;
  tokens?: number;
}

export interface PlanningTask {
  id: string;
  dependsOn?: string[];
  cost: TaskCost;
  /** Resources held during execution (e.g. agent name). */
  resources?: string[];
  priority?: number;
}

export interface ParallelLayer { layer: number; tasks: string[]; }
export interface CriticalPath { path: string[]; totalDurationMs: number; }
export interface ResourceSchedule {
  resource: string;
  assignments: Array<{ taskId: string; startMs: number; endMs: number }>;
}

/**
 * Phase 9 surface — Advanced Execution Planner. Operates on a static
 * dependency graph and returns parallel layers, the critical path, a
 * resource schedule, and a priority-ordered task list. Output drops into the
 * WorkflowEngine via `toWorkflow()`; it does not execute work itself.
 */
export class ExecutionPlanner {
  /** Topological layers — every task in one layer may run in parallel. */
  parallelLayers(tasks: PlanningTask[]): ParallelLayer[] {
    const remaining = new Map(tasks.map((task) => [task.id, [...(task.dependsOn ?? [])]]));
    const layers: ParallelLayer[] = [];
    let layer = 0;
    while (remaining.size > 0) {
      const ready = [...remaining.entries()]
        .filter(([, deps]) => deps.length === 0)
        .map(([id]) => id);
      if (ready.length === 0) throw new Error("Cycle in planning graph");
      layers.push({ layer, tasks: ready });
      for (const id of ready) remaining.delete(id);
      for (const deps of remaining.values()) {
        for (let i = deps.length - 1; i >= 0; i -= 1) {
          if (ready.includes(deps[i]!)) deps.splice(i, 1);
        }
      }
      layer += 1;
    }
    return layers;
  }

  /** Longest-duration path through the DAG; the project's lower bound. */
  criticalPath(tasks: PlanningTask[]): CriticalPath {
    const byId = new Map(tasks.map((task) => [task.id, task]));
    const earliest = new Map<string, number>();
    const predecessor = new Map<string, string | undefined>();

    const compute = (id: string): number => {
      if (earliest.has(id)) return earliest.get(id)!;
      const task = byId.get(id);
      if (!task) return 0;
      let best = 0;
      let bestDep: string | undefined;
      for (const depId of task.dependsOn ?? []) {
        const dep = compute(depId);
        if (dep > best) {
          best = dep;
          bestDep = depId;
        }
      }
      const total = best + task.cost.durationMs;
      earliest.set(id, total);
      predecessor.set(id, bestDep);
      return total;
    };

    let endId = "";
    let endTime = 0;
    for (const task of tasks) {
      const total = compute(task.id);
      if (total >= endTime) {
        endTime = total;
        endId = task.id;
      }
    }

    const path: string[] = [];
    let current: string | undefined = endId;
    while (current) {
      path.unshift(current);
      current = predecessor.get(current);
    }
    return { path, totalDurationMs: endTime };
  }

  /** Honours resource exclusivity — a single resource never runs two tasks at once. */
  resourceSchedule(tasks: PlanningTask[]): ResourceSchedule[] {
    const layers = this.parallelLayers(tasks);
    const byId = new Map(tasks.map((task) => [task.id, task]));
    const resourceFree = new Map<string, number>();
    const taskEnd = new Map<string, number>();
    const schedule = new Map<string, ResourceSchedule>();

    for (const { tasks: ids } of layers) {
      for (const id of ids) {
        const task = byId.get(id)!;
        let start = 0;
        for (const depId of task.dependsOn ?? []) start = Math.max(start, taskEnd.get(depId) ?? 0);
        for (const resource of task.resources ?? []) {
          start = Math.max(start, resourceFree.get(resource) ?? 0);
        }
        const end = start + task.cost.durationMs;
        taskEnd.set(id, end);
        for (const resource of task.resources ?? []) {
          resourceFree.set(resource, end);
          if (!schedule.has(resource)) schedule.set(resource, { resource, assignments: [] });
          schedule.get(resource)!.assignments.push({ taskId: id, startMs: start, endMs: end });
        }
      }
    }
    return [...schedule.values()];
  }

  /** Priority + critical-path participation drives the run order. */
  prioritize(tasks: PlanningTask[]): PlanningTask[] {
    const cp = new Set(this.criticalPath(tasks).path);
    return [...tasks].sort((a, b) => {
      const ap = (a.priority ?? 0) + (cp.has(a.id) ? 100 : 0);
      const bp = (b.priority ?? 0) + (cp.has(b.id) ? 100 : 0);
      return bp - ap;
    });
  }

  /** Convert plan to a WorkflowDefinition the WorkflowEngine can execute. */
  toWorkflow(workflowId: string, tasks: PlanningTask[], name = "planner-generated"): WorkflowDefinition {
    const nodes: WorkflowNode[] = tasks.map((task) => ({
      id: task.id,
      kind: "planned",
      payload: task,
      dependsOn: task.dependsOn ?? [],
    }));
    return { id: workflowId, name, nodes };
  }
}
