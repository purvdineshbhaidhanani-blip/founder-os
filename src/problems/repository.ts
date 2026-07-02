import type { ArtifactManager } from "../runtime/artifacts/manager.js";
import type { MemoryEngine } from "../runtime/memory/engine.js";
import type { ProblemIntelligenceReport } from "./types.js";

export interface ClusterRepositoryOptions {
  artifacts: ArtifactManager;
  memory: MemoryEngine;
}

/**
 * Persists ProblemIntelligenceReports as artifacts and indexes them in
 * project memory, mirroring ResearchEngine's artifact + memory pattern.
 */
export class ClusterRepository {
  private readonly artifacts: ArtifactManager;
  private readonly memory: MemoryEngine;

  constructor(options: ClusterRepositoryOptions) {
    this.artifacts = options.artifacts;
    this.memory = options.memory;
  }

  async persist(report: ProblemIntelligenceReport): Promise<ProblemIntelligenceReport> {
    const artifact = await this.artifacts.register({
      name: `Problem intelligence report ${report.id}`,
      kind: "report",
      owner: "problem-intelligence-engine",
      content: JSON.stringify(report),
    });
    report.artifactId = artifact.id;

    await this.memory.remember("project", report.id, report, {
      tags: ["problem-intelligence", report.sourceSessionId],
    });

    return report;
  }

  async list(): Promise<ProblemIntelligenceReport[]> {
    const entries = await this.memory.recall({ namespace: "project", tag: "problem-intelligence" });
    return entries.map((entry) => entry.data as ProblemIntelligenceReport);
  }

  async get(reportId: string): Promise<ProblemIntelligenceReport | null> {
    const entries = await this.memory.recall({ namespace: "project", key: reportId });
    const match = entries.find((entry) => entry.key === reportId);
    return match ? (match.data as ProblemIntelligenceReport) : null;
  }
}
