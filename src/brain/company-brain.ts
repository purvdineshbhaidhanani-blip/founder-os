import { nowIso } from "../utils/id.js";
import type { Timestamp } from "../types/common.js";
import type { AgentRuntime } from "../runtime/agents/runtime.js";
import type { MemoryEngine } from "../runtime/memory/engine.js";
import type { ArtifactManager } from "../runtime/artifacts/manager.js";
import type { CapabilityDirectory } from "../capability/directory.js";
import type { KnowledgeDatabases } from "../knowledge/databases.js";
import type { CompanyOS } from "../org/org.js";
import type { CompanyRituals, DecisionLogEntry } from "../org/rituals.js";
import type { WorkflowLibrary } from "../workflows-library/registry.js";
import type { SkillRegistry } from "../skills/registry.js";
import type { ConnectorRegistry } from "../connectors/registry.js";
import type { FounderVault } from "../vault/vault.js";
import type { AgentDiscoveryEngine, AgentRanking } from "../discovery/engine.js";
import type { LearningEngine, ImprovementProposal } from "../learning/engine.js";
import type { AgentAnalytics } from "../analytics/agents.js";

export interface BrainRecommendation {
  topic: string;
  recommendation: string;
  rationale: string;
  evidence: string[];
  confidence: "low" | "medium" | "high";
  createdAt: Timestamp;
}

export interface BrainState {
  takenAt: Timestamp;
  agents: { total: number; active: number; idle: number };
  projects: { total: number; active: number; shipped: number };
  decisions: number;
  artifacts: number;
  skills: number;
  workflowsCatalog: number;
  connectors: { configured: number; missingCredentials: number };
  vaultEntries: number;
  pendingProposals: number;
}

export interface DuplicateWorkSignal {
  topic: string;
  parties: string[];
  evidence: string[];
}

export interface BrainCoordinatorOptions {
  runtime: AgentRuntime;
  memory: MemoryEngine;
  artifacts: ArtifactManager;
  directory: CapabilityDirectory;
  knowledge: KnowledgeDatabases;
  companyOS: CompanyOS;
  rituals: CompanyRituals;
  workflows: WorkflowLibrary;
  skills: SkillRegistry;
  connectors: ConnectorRegistry;
  vault: FounderVault;
  discovery: AgentDiscoveryEngine;
  learning: LearningEngine;
  analytics: AgentAnalytics;
}

/**
 * Phase 2 — Company Brain coordinator. Composes every subsystem in the OS and
 * exposes a single Chief-of-Staff API: state(), routeTask(), preventDuplicateWork(),
 * recommend(), recall(), record(). The companion spec.ts creates the agent
 * record so the brain is also an addressable agent in the runtime.
 */
export class CompanyBrain {
  private recommendations: BrainRecommendation[] = [];
  constructor(private opts: BrainCoordinatorOptions) {}

  /** Comprehensive snapshot of every dimension the brain tracks. */
  state(): BrainState {
    const agents = this.opts.runtime.list();
    const projects = this.opts.companyOS.listProjects();
    const connectorStatuses = this.opts.connectors.list();
    return {
      takenAt: nowIso(),
      agents: {
        total: agents.length,
        active: agents.filter((a) => a.status === "active").length,
        idle: agents.filter((a) => a.status !== "active").length,
      },
      projects: {
        total: projects.length,
        active: projects.filter((p) => p.status === "active").length,
        shipped: projects.filter((p) => p.status === "shipped").length,
      },
      decisions: this.opts.rituals.listDecisions().length,
      artifacts: this.opts.artifacts.list().length,
      skills: this.opts.skills.list().length,
      workflowsCatalog: this.opts.workflows.list().length,
      connectors: {
        configured: connectorStatuses.filter((c) => c.status === "configured").length,
        missingCredentials: connectorStatuses.filter((c) => c.status === "missing-credentials").length,
      },
      vaultEntries: this.opts.vault.list().length,
      pendingProposals: this.opts.learning.proposalsList({ status: "pending" }).length,
    };
  }

  /** Pick the best agent for a capability-described task. */
  routeTask(input: { capability: string; preferredDepartment?: string }): AgentRanking | undefined {
    const ranking = this.opts.discovery.find({
      capability: input.capability,
      department: input.preferredDepartment,
    });
    return ranking[0];
  }

  /** Detect overlapping work across active projects or agents. */
  preventDuplicateWork(): DuplicateWorkSignal[] {
    const signals: DuplicateWorkSignal[] = [];

    const duplicateAgents = this.opts.discovery.duplicateAgents(3);
    for (const dup of duplicateAgents) {
      signals.push({
        topic: "agent-capability-overlap",
        parties: [dup.a, dup.b],
        evidence: dup.shared.map((cap) => `Both claim: ${cap}`),
      });
    }

    const activeProjects = this.opts.companyOS.listProjects({ status: "active" });
    for (let i = 0; i < activeProjects.length; i += 1) {
      for (let j = i + 1; j < activeProjects.length; j += 1) {
        const a = activeProjects[i]!;
        const b = activeProjects[j]!;
        const aWords = new Set(a.goal.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
        const overlap = b.goal.toLowerCase().split(/\W+/).filter((w) => aWords.has(w));
        if (overlap.length >= 3) {
          signals.push({
            topic: "project-goal-overlap",
            parties: [a.name, b.name],
            evidence: [`Shared terms: ${overlap.slice(0, 5).join(", ")}`],
          });
        }
      }
    }
    return signals;
  }

  /** Aggregate proposals + cost suggestions + duplicate detections into one feed. */
  recommend(): BrainRecommendation[] {
    const out: BrainRecommendation[] = [];
    for (const proposal of this.opts.learning.proposalsList({ status: "pending" })) {
      out.push(this.fromProposal(proposal));
    }
    for (const signal of this.preventDuplicateWork()) {
      out.push({
        topic: signal.topic,
        recommendation: `Reconcile duplicate work between ${signal.parties.join(" and ")}.`,
        rationale: signal.evidence.join(" / "),
        evidence: signal.evidence,
        confidence: "medium",
        createdAt: nowIso(),
      });
    }
    for (const rec of this.opts.analytics.recommendations()) {
      out.push({
        topic: "agent-performance",
        recommendation: rec,
        rationale: "Surfaced by Agent Analytics rankings.",
        evidence: [],
        confidence: "medium",
        createdAt: nowIso(),
      });
    }
    this.recommendations.push(...out);
    return out;
  }

  recallDecisions(filter?: { projectId?: string; text?: string }): DecisionLogEntry[] {
    const all = this.opts.rituals.listDecisions({ projectId: filter?.projectId });
    if (!filter?.text) return all;
    const needle = filter.text.toLowerCase();
    return all.filter((entry) =>
      `${entry.topic} ${entry.decision} ${entry.rationale}`.toLowerCase().includes(needle),
    );
  }

  /** Free-text search across memory, knowledge, decisions, vault, artifacts. */
  async recall(query: string): Promise<{
    memory: Awaited<ReturnType<MemoryEngine["recall"]>>;
    knowledge: ReturnType<KnowledgeDatabases["search"]>;
    decisions: DecisionLogEntry[];
    vault: ReturnType<FounderVault["search"]>;
    artifacts: ReturnType<ArtifactManager["list"]>;
  }> {
    const [memory] = await Promise.all([this.opts.memory.recall({ text: query })]);
    return {
      memory,
      knowledge: this.opts.knowledge.search(query),
      decisions: this.recallDecisions({ text: query }),
      vault: this.opts.vault.search({ text: query }),
      artifacts: this.opts.artifacts.list({ name: query }),
    };
  }

  /** Permanently store a noteworthy company event. */
  record(input: { kind: "decision" | "lesson" | "preference"; topic: string; content: string; by: string }): void {
    if (input.kind === "decision") {
      this.opts.rituals.logDecision({
        topic: input.topic,
        decision: input.content,
        rationale: "Recorded by Company Brain",
        decidedBy: input.by,
      });
    }
    this.opts.vault.add({
      kind: input.kind === "decision" ? "decision" : input.kind === "lesson" ? "lesson" : "preference",
      title: input.topic,
      content: input.content,
      tags: ["brain", input.by],
    });
  }

  /** History of recommendations the brain has surfaced. */
  history(): BrainRecommendation[] { return [...this.recommendations]; }

  private fromProposal(proposal: ImprovementProposal): BrainRecommendation {
    return {
      topic: `${proposal.target}:${proposal.subject}`,
      recommendation: proposal.recommendation,
      rationale: proposal.rationale,
      evidence: [`Evidence count: ${proposal.evidenceCount}`],
      confidence: proposal.confidence,
      createdAt: proposal.createdAt,
    };
  }
}
