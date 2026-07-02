import type { ArtifactManager } from "../runtime/artifacts/manager.js";
import type { MemoryEngine } from "../runtime/memory/engine.js";
import type { TopOpportunitiesReport } from "./types.js";

export interface OpportunityRepositoryOptions {
  artifacts: ArtifactManager;
  memory: MemoryEngine;
}

/**
 * Persists TopOpportunitiesReports as artifacts and indexes them in project
 * memory, mirroring ClusterRepository's artifact + memory pattern.
 */
export class OpportunityRepository {
  private readonly artifacts: ArtifactManager;
  private readonly memory: MemoryEngine;

  constructor(options: OpportunityRepositoryOptions) {
    this.artifacts = options.artifacts;
    this.memory = options.memory;
  }

  async persist(report: TopOpportunitiesReport): Promise<TopOpportunitiesReport> {
    const artifact = await this.artifacts.register({
      name: `Top opportunities report ${report.id}`,
      kind: "report",
      owner: "opportunity-engine",
      content: JSON.stringify(report),
    });
    report.artifactId = artifact.id;

    await this.memory.remember("project", report.id, report, {
      tags: ["opportunities", report.sourceSessionId],
    });

    return report;
  }

  async list(): Promise<TopOpportunitiesReport[]> {
    const entries = await this.memory.recall({ namespace: "project", tag: "opportunities" });
    return entries.map((entry) => entry.data as TopOpportunitiesReport);
  }

  async get(reportId: string): Promise<TopOpportunitiesReport | null> {
    const entries = await this.memory.recall({ namespace: "project", key: reportId });
    const match = entries.find((entry) => entry.key === reportId);
    return match ? (match.data as TopOpportunitiesReport) : null;
  }
}
