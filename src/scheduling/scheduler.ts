import { generateId, nowIso } from "../utils/id.js";
import type { Timestamp } from "../types/common.js";
import type { TaskQueue } from "../runtime/queue/queue.js";

export interface ProjectAllocation {
  projectId: string;
  priority: number;
  weight: number;
  /** Resource budget — typically agent names this project can use. */
  reservedResources: string[];
  deadline?: Timestamp;
}

export interface CrossProjectDependency {
  from: { projectId: string; taskId: string };
  to: { projectId: string; taskId: string };
}

export interface PortfolioSnapshot {
  totalProjects: number;
  totalQueuedTasks: number;
  resourceUtilization: Record<string, number>;
  weightedShare: Record<string, number>;
  overdue: string[];
}

/**
 * Multi-Project Scheduler — balances priority and weight across concurrent
 * projects, tracks cross-project dependencies, and surfaces portfolio
 * snapshots for the command center. Decisions are advisory; the underlying
 * TaskQueue executes work and the Master Orchestrator enqueues it.
 */
export class MultiProjectScheduler {
  private allocations = new Map<string, ProjectAllocation>();
  private dependencies: CrossProjectDependency[] = [];

  constructor(private queue: TaskQueue) {}

  allocate(allocation: ProjectAllocation): void {
    this.allocations.set(allocation.projectId, allocation);
  }

  release(projectId: string): void {
    this.allocations.delete(projectId);
    this.dependencies = this.dependencies.filter(
      (dep) => dep.from.projectId !== projectId && dep.to.projectId !== projectId,
    );
  }

  addDependency(dep: CrossProjectDependency): void {
    this.dependencies.push(dep);
  }

  /** Returns the project order the scheduler recommends for dispatch this tick. */
  nextDispatchOrder(): string[] {
    const allocations = [...this.allocations.values()];
    return allocations
      .map((allocation) => ({
        projectId: allocation.projectId,
        rank:
          allocation.priority * 10 +
          allocation.weight +
          (allocation.deadline ? Math.max(0, 100 - (Date.parse(allocation.deadline) - Date.now()) / 86_400_000) : 0),
      }))
      .sort((a, b) => b.rank - a.rank)
      .map((entry) => entry.projectId);
  }

  /** Distribute remaining queue slots proportionally to project weight. */
  weightedShares(): Record<string, number> {
    const totalWeight = [...this.allocations.values()].reduce((sum, alloc) => sum + alloc.weight, 0);
    const shares: Record<string, number> = {};
    if (totalWeight === 0) return shares;
    for (const alloc of this.allocations.values()) {
      shares[alloc.projectId] = alloc.weight / totalWeight;
    }
    return shares;
  }

  resourceUtilization(): Record<string, number> {
    const tallies: Record<string, number> = {};
    for (const alloc of this.allocations.values()) {
      for (const resource of alloc.reservedResources) {
        tallies[resource] = (tallies[resource] ?? 0) + 1;
      }
    }
    return tallies;
  }

  /** Cross-project dependency resolved if the upstream task is succeeded. */
  isCrossDependencyClear(dep: CrossProjectDependency): boolean {
    const upstream = this.queue.get(dep.from.taskId);
    return upstream?.status === "succeeded";
  }

  /** Project ids past their deadline. */
  overdueProjects(now: Timestamp = nowIso()): string[] {
    const nowMs = Date.parse(now);
    return [...this.allocations.values()]
      .filter((alloc) => alloc.deadline && Date.parse(alloc.deadline) < nowMs)
      .map((alloc) => alloc.projectId);
  }

  snapshot(): PortfolioSnapshot {
    const totalQueuedTasks = this.queue.list({ statuses: ["queued", "scheduled"] }).length;
    return {
      totalProjects: this.allocations.size,
      totalQueuedTasks,
      resourceUtilization: this.resourceUtilization(),
      weightedShare: this.weightedShares(),
      overdue: this.overdueProjects(),
    };
  }

  /** Convenience: enqueue a task tagged for a project. */
  enqueueForProject(projectId: string, payload: unknown, kind = "agent.execute"): string {
    const allocation = this.allocations.get(projectId);
    if (!allocation) throw new Error(`No allocation for project "${projectId}"`);
    const record = this.queue.enqueue({
      id: `${projectId}:${generateId("t").slice(0, 8)}`,
      kind,
      payload: { projectId, payload },
      priority: allocation.priority,
    });
    return record.id;
  }
}
