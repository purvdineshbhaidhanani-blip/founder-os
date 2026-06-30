import { generateId, nowIso } from "../utils/id.js";
import type { Artifact } from "../runtime/artifacts/types.js";
import type { ArtifactManager } from "../runtime/artifacts/manager.js";
import type { EventBus } from "../runtime/events/bus.js";
import type { Timestamp } from "../types/common.js";

export interface WorkspaceLock {
  artifactId: string;
  heldBy: string;
  acquiredAt: Timestamp;
  expiresAt: Timestamp;
}

export interface WorkspaceDecision {
  id: string;
  workspaceId: string;
  agent: string;
  topic: string;
  decision: string;
  rationale: string;
  decidedAt: Timestamp;
}

export interface TimelineEntry {
  id: string;
  workspaceId: string;
  timestamp: Timestamp;
  agent: string;
  kind: "artifact-created" | "artifact-updated" | "decision" | "milestone" | "note";
  message: string;
  payload?: unknown;
}

export interface Workspace {
  id: string;
  projectId: string;
  createdAt: Timestamp;
  members: string[];
  artifacts: string[];
  /** Ownership: artifact id → owning agent name. */
  ownership: Record<string, string>;
  locks: WorkspaceLock[];
  decisions: WorkspaceDecision[];
  timeline: TimelineEntry[];
  sharedContext: Record<string, unknown>;
}

export interface SharedWorkspaceOptions {
  artifacts: ArtifactManager;
  events?: EventBus;
  lockTtlMs?: number;
}

/**
 * Phase 8 surface — a Shared Project Workspace per project. Tracks live
 * artifacts with ownership, write locks, conflict detection, shared context
 * routing, decision sharing, artifact sharing across workspaces, and a live
 * project timeline emitted on the Event Bus.
 */
export class SharedWorkspace {
  private workspaces = new Map<string, Workspace>();
  private artifacts: ArtifactManager;
  private events?: EventBus;
  private lockTtlMs: number;

  constructor(options: SharedWorkspaceOptions) {
    this.artifacts = options.artifacts;
    this.events = options.events;
    this.lockTtlMs = options.lockTtlMs ?? 300_000;
  }

  create(projectId: string, members: string[] = []): Workspace {
    const workspace: Workspace = {
      id: generateId("ws"),
      projectId,
      createdAt: nowIso(),
      members: [...members],
      artifacts: [],
      ownership: {},
      locks: [],
      decisions: [],
      timeline: [],
      sharedContext: {},
    };
    this.workspaces.set(workspace.id, workspace);
    return workspace;
  }

  get(id: string): Workspace | undefined { return this.workspaces.get(id); }
  list(): Workspace[] { return [...this.workspaces.values()]; }

  addMember(workspaceId: string, agent: string): void {
    const ws = this.require(workspaceId);
    if (!ws.members.includes(agent)) ws.members.push(agent);
  }

  /** Adds an artifact and records its owner. Owner has the implicit right to lock. */
  addArtifact(workspaceId: string, artifact: Artifact, owner: string): void {
    const ws = this.require(workspaceId);
    if (!ws.artifacts.includes(artifact.id)) ws.artifacts.push(artifact.id);
    ws.ownership[artifact.id] = owner;
    this.appendTimeline(ws, {
      agent: owner,
      kind: "artifact-created",
      message: `Added ${artifact.kind} artifact "${artifact.name}"`,
      payload: { artifactId: artifact.id },
    });
  }

  ownerOf(workspaceId: string, artifactId: string): string | undefined {
    return this.require(workspaceId).ownership[artifactId];
  }

  /** Acquires an exclusive write lock. Returns false if another holder owns it. */
  lock(workspaceId: string, artifactId: string, holder: string): boolean {
    const ws = this.require(workspaceId);
    this.expireLocks(ws);
    const conflict = ws.locks.find((lock) => lock.artifactId === artifactId && lock.heldBy !== holder);
    if (conflict) return false;
    ws.locks = ws.locks.filter((lock) => lock.artifactId !== artifactId);
    ws.locks.push({
      artifactId,
      heldBy: holder,
      acquiredAt: nowIso(),
      expiresAt: new Date(Date.now() + this.lockTtlMs).toISOString(),
    });
    return true;
  }

  unlock(workspaceId: string, artifactId: string, holder: string): void {
    const ws = this.require(workspaceId);
    ws.locks = ws.locks.filter((lock) => !(lock.artifactId === artifactId && lock.heldBy === holder));
  }

  detectConflicts(workspaceId: string): Array<{ artifactId: string; holders: string[] }> {
    const ws = this.require(workspaceId);
    const map = new Map<string, Set<string>>();
    for (const lock of ws.locks) {
      if (!map.has(lock.artifactId)) map.set(lock.artifactId, new Set());
      map.get(lock.artifactId)!.add(lock.heldBy);
    }
    return [...map.entries()]
      .filter(([, holders]) => holders.size > 1)
      .map(([artifactId, holders]) => ({ artifactId, holders: [...holders] }));
  }

  setSharedContext(workspaceId: string, key: string, value: unknown): void {
    const ws = this.require(workspaceId);
    ws.sharedContext[key] = value;
  }

  /** Returns context routed to a specific agent (currently the full shared context). */
  contextFor(workspaceId: string, agent: string): Record<string, unknown> {
    const ws = this.require(workspaceId);
    if (!ws.members.includes(agent)) ws.members.push(agent);
    return { ...ws.sharedContext };
  }

  decide(
    workspaceId: string,
    decision: Omit<WorkspaceDecision, "id" | "workspaceId" | "decidedAt">,
  ): WorkspaceDecision {
    const ws = this.require(workspaceId);
    const record: WorkspaceDecision = {
      id: generateId("dec"),
      workspaceId,
      decidedAt: nowIso(),
      ...decision,
    };
    ws.decisions.push(record);
    this.appendTimeline(ws, {
      agent: decision.agent,
      kind: "decision",
      message: decision.topic,
      payload: { decisionId: record.id },
    });
    return record;
  }

  /** Imports an artifact from one workspace into another. */
  shareArtifact(fromWs: string, toWs: string, artifactId: string, agent: string): void {
    const from = this.require(fromWs);
    const to = this.require(toWs);
    if (!from.artifacts.includes(artifactId)) {
      throw new Error(`Artifact ${artifactId} not in source workspace`);
    }
    if (!to.artifacts.includes(artifactId)) to.artifacts.push(artifactId);
    to.ownership[artifactId] = to.ownership[artifactId] ?? from.ownership[artifactId]!;
    this.appendTimeline(to, {
      agent,
      kind: "artifact-created",
      message: `Imported artifact ${artifactId} from ${fromWs}`,
    });
  }

  timeline(workspaceId: string, limit = 100): TimelineEntry[] {
    const ws = this.require(workspaceId);
    return ws.timeline.slice(-limit);
  }

  note(workspaceId: string, agent: string, message: string): TimelineEntry {
    const ws = this.require(workspaceId);
    return this.appendTimeline(ws, { agent, kind: "note", message });
  }

  /** ArtifactManager is exposed so consumers can resolve ids to artifact metadata. */
  resolveArtifact(artifactId: string): Artifact | undefined {
    return this.artifacts.get(artifactId);
  }

  private appendTimeline(
    ws: Workspace,
    entry: Omit<TimelineEntry, "id" | "workspaceId" | "timestamp">,
  ): TimelineEntry {
    const record: TimelineEntry = {
      id: generateId("tl"),
      workspaceId: ws.id,
      timestamp: nowIso(),
      ...entry,
    };
    ws.timeline.push(record);
    void this.events?.publish({
      name: `workspace.${entry.kind}` as never,
      source: entry.agent,
      correlationId: ws.id,
      payload: record,
    });
    return record;
  }

  private expireLocks(ws: Workspace): void {
    const now = Date.now();
    ws.locks = ws.locks.filter((lock) => Date.parse(lock.expiresAt) > now);
  }

  private require(id: string): Workspace {
    const workspace = this.workspaces.get(id);
    if (!workspace) throw new Error(`Unknown workspace "${id}"`);
    return workspace;
  }
}
