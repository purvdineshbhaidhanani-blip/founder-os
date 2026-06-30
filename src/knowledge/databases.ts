import type { GraphNode, NodeKind } from "./graph.js";
import { KnowledgeGraph } from "./graph.js";

/**
 * Typed lenses over a single KnowledgeGraph. Each "database" is just a kind
 * filter + add/list/find helpers, so cross-domain links (e.g. a decision
 * supersedes a competitor pricing) are tracked in one graph.
 */

export interface ResearchRecord { topic: string; summary: string; }
export interface ProjectRecord { name: string; status: "planning" | "active" | "shipped" | "archived"; goal: string; }
export interface CompetitorRecord { name: string; url?: string; segment: string; strengths: string[]; weaknesses: string[]; }
export interface PricingRecord { vendor: string; plan: string; monthlyUsd: number; features: string[]; }
export interface SkillRecord { skillId: string; name: string; version: string; }
export interface PromptRecord { promptId: string; name: string; version: string; system: string; }
export interface BlueprintRecord { name: string; version: string; }
export interface LearningRecord { topic: string; lesson: string; }
export interface DecisionRecord { topic: string; decision: string; rationale: string; decidedBy: string; }
export interface ArtifactRecord { artifactId: string; name: string; kind: string; }

export interface TypedDb<T> {
  add(label: string, data: T, tags?: string[]): GraphNode<T>;
  list(): GraphNode<T>[];
  find(text: string): GraphNode<T>[];
}

function typedView<T>(graph: KnowledgeGraph, kind: NodeKind): TypedDb<T> {
  return {
    add(label, data, tags) {
      return graph.addNode<T>({ kind, label, data, tags: tags ?? [] });
    },
    list() {
      return graph.query({ kind }) as GraphNode<T>[];
    },
    find(text) {
      return graph.query({ kind, text }) as GraphNode<T>[];
    },
  };
}

export class KnowledgeDatabases {
  readonly graph: KnowledgeGraph;
  readonly research: TypedDb<ResearchRecord>;
  readonly projects: TypedDb<ProjectRecord>;
  readonly competitors: TypedDb<CompetitorRecord>;
  readonly pricing: TypedDb<PricingRecord>;
  readonly skills: TypedDb<SkillRecord>;
  readonly prompts: TypedDb<PromptRecord>;
  readonly blueprints: TypedDb<BlueprintRecord>;
  readonly learnings: TypedDb<LearningRecord>;
  readonly decisions: TypedDb<DecisionRecord>;
  readonly artifacts: TypedDb<ArtifactRecord>;

  constructor(graph: KnowledgeGraph = new KnowledgeGraph()) {
    this.graph = graph;
    this.research = typedView<ResearchRecord>(graph, "research");
    this.projects = typedView<ProjectRecord>(graph, "project");
    this.competitors = typedView<CompetitorRecord>(graph, "competitor");
    this.pricing = typedView<PricingRecord>(graph, "pricing");
    this.skills = typedView<SkillRecord>(graph, "skill");
    this.prompts = typedView<PromptRecord>(graph, "prompt");
    this.blueprints = typedView<BlueprintRecord>(graph, "blueprint");
    this.learnings = typedView<LearningRecord>(graph, "learning");
    this.decisions = typedView<DecisionRecord>(graph, "decision");
    this.artifacts = typedView<ArtifactRecord>(graph, "artifact");
  }

  /** Full-text search across every record kind. */
  search(text: string): GraphNode[] {
    return this.graph.query({ text });
  }
}
