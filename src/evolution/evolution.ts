import { nowIso } from "../utils/id.js";
import type { Timestamp } from "../types/common.js";
import type { LearningEngine, ImprovementProposal, LearningTarget } from "../learning/engine.js";

export interface EvolutionAction {
  id: string;
  proposalId: string;
  target: LearningTarget;
  appliedAt: Timestamp;
  result: "applied" | "deferred" | "rejected";
  note?: string;
}

export interface EvolutionPolicy {
  /** Confidence threshold to auto-apply a proposal. Below this, defer for review. */
  minAutoApplyConfidence: "low" | "medium" | "high";
  /** Targets that must never be auto-applied (require human ratification). */
  protectedTargets: LearningTarget[];
}

const RANK: Record<"low" | "medium" | "high", number> = { low: 1, medium: 2, high: 3 };

/**
 * Self Evolution Engine — Phase 14. Reads pending proposals from the
 * Learning Engine and applies them under policy. Stable systems (architecture,
 * blueprints) are protected from auto-application; everything else can
 * upgrade itself once enough evidence accumulates.
 */
export class SelfEvolutionEngine {
  private actions: EvolutionAction[] = [];
  private policy: EvolutionPolicy = {
    minAutoApplyConfidence: "high",
    protectedTargets: ["architecture", "blueprint"],
  };

  constructor(private learning: LearningEngine) {}

  setPolicy(policy: Partial<EvolutionPolicy>): void {
    this.policy = { ...this.policy, ...policy };
  }

  /** Walks pending proposals and either applies, defers, or rejects each per policy. */
  tick(): EvolutionAction[] {
    const proposals = this.learning.proposalsList({ status: "pending" });
    const applied: EvolutionAction[] = [];
    for (const proposal of proposals) {
      applied.push(this.evaluate(proposal));
    }
    return applied;
  }

  history(): EvolutionAction[] { return [...this.actions]; }

  private evaluate(proposal: ImprovementProposal): EvolutionAction {
    const id = `evo:${proposal.id}`;
    const baseAction: Omit<EvolutionAction, "result" | "note"> = {
      id,
      proposalId: proposal.id,
      target: proposal.target,
      appliedAt: nowIso(),
    };

    if (this.policy.protectedTargets.includes(proposal.target)) {
      const action: EvolutionAction = { ...baseAction, result: "deferred", note: "protected target — needs human review" };
      this.actions.push(action);
      return action;
    }

    if (RANK[proposal.confidence] < RANK[this.policy.minAutoApplyConfidence]) {
      const action: EvolutionAction = { ...baseAction, result: "deferred", note: "confidence below auto-apply threshold" };
      this.actions.push(action);
      return action;
    }

    this.learning.applyProposal(proposal.id);
    const action: EvolutionAction = { ...baseAction, result: "applied", note: proposal.recommendation };
    this.actions.push(action);
    return action;
  }
}
