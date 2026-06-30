import { generateId, nowIso } from "../utils/id.js";
import type { Timestamp } from "../types/common.js";

export type LearningTarget =
  | "skill"
  | "prompt"
  | "template"
  | "blueprint"
  | "workflow"
  | "architecture"
  | "planning"
  | "execution"
  | "research"
  | "documentation";

export interface ProjectOutcome {
  projectId: string;
  goal: string;
  succeeded: boolean;
  durationMs: number;
  failedSubtasks: number;
  succeededSubtasks: number;
  notes?: string;
}

export interface LearningRecord {
  id: string;
  target: LearningTarget;
  subject: string;
  observation: string;
  evidenceProjectIds: string[];
  confidence: "low" | "medium" | "high";
  createdAt: Timestamp;
}

export interface ImprovementProposal {
  id: string;
  target: LearningTarget;
  subject: string;
  recommendation: string;
  rationale: string;
  evidenceCount: number;
  confidence: "low" | "medium" | "high";
  createdAt: Timestamp;
  /** Until applied, every proposal is `pending`. */
  status: "pending" | "applied" | "rejected";
}

/**
 * Learning Engine — Phase 10. After each completed project, the orchestrator
 * calls `observe()`. The engine collects learnings, looks for patterns across
 * multiple projects, and produces ImprovementProposals. Proposals are never
 * applied automatically — Self Evolution (and ultimately a human) ratifies.
 */
export class LearningEngine {
  private outcomes = new Map<string, ProjectOutcome>();
  private learnings: LearningRecord[] = [];
  private proposals: ImprovementProposal[] = [];

  observe(outcome: ProjectOutcome): void {
    this.outcomes.set(outcome.projectId, outcome);

    if (!outcome.succeeded && outcome.failedSubtasks > 0) {
      this.recordLearning({
        target: "execution",
        subject: outcome.projectId,
        observation: `Project failed with ${outcome.failedSubtasks} failed subtask(s).`,
        evidenceProjectIds: [outcome.projectId],
        confidence: "low",
      });
    }

    if (outcome.succeeded && outcome.durationMs > 0) {
      this.recordLearning({
        target: "planning",
        subject: outcome.projectId,
        observation: `Project completed in ${(outcome.durationMs / 1000).toFixed(0)}s with ${outcome.succeededSubtasks} subtasks.`,
        evidenceProjectIds: [outcome.projectId],
        confidence: "medium",
      });
    }
  }

  recordLearning(input: Omit<LearningRecord, "id" | "createdAt">): LearningRecord {
    const record: LearningRecord = { id: generateId("learn"), createdAt: nowIso(), ...input };
    this.learnings.push(record);
    return record;
  }

  /** Combine related learnings into proposals when enough evidence accumulates. */
  synthesize(): ImprovementProposal[] {
    const groups = new Map<string, LearningRecord[]>();
    for (const record of this.learnings) {
      const key = `${record.target}::${record.subject}`;
      const list = groups.get(key) ?? [];
      list.push(record);
      groups.set(key, list);
    }

    const fresh: ImprovementProposal[] = [];
    for (const [key, records] of groups) {
      if (records.length < 2) continue;
      const target = records[0]!.target;
      const subject = records[0]!.subject;
      if (this.proposals.find((p) => p.target === target && p.subject === subject && p.status === "pending")) continue;

      const evidenceCount = records.length;
      const confidence: ImprovementProposal["confidence"] =
        evidenceCount >= 5 ? "high" : evidenceCount >= 3 ? "medium" : "low";
      fresh.push({
        id: generateId("prop"),
        target,
        subject,
        recommendation: `Review and update "${subject}" — ${evidenceCount} learnings recorded.`,
        rationale: records.map((r) => r.observation).join(" | "),
        evidenceCount,
        confidence,
        createdAt: nowIso(),
        status: "pending",
      });
      void key;
    }

    this.proposals.push(...fresh);
    return fresh;
  }

  proposalsList(filter?: { status?: ImprovementProposal["status"]; target?: LearningTarget }): ImprovementProposal[] {
    return this.proposals.filter((proposal) => {
      if (filter?.status && proposal.status !== filter.status) return false;
      if (filter?.target && proposal.target !== filter.target) return false;
      return true;
    });
  }

  applyProposal(id: string): ImprovementProposal {
    const proposal = this.proposals.find((p) => p.id === id);
    if (!proposal) throw new Error(`Unknown proposal "${id}"`);
    proposal.status = "applied";
    return proposal;
  }

  rejectProposal(id: string): ImprovementProposal {
    const proposal = this.proposals.find((p) => p.id === id);
    if (!proposal) throw new Error(`Unknown proposal "${id}"`);
    proposal.status = "rejected";
    return proposal;
  }

  learningsList(): LearningRecord[] { return [...this.learnings]; }
  outcomesList(): ProjectOutcome[] { return [...this.outcomes.values()]; }
}
