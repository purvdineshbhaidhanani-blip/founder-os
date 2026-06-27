import path from "node:path";
import { PATHS } from "../../constants/paths.js";
import { contentHash } from "../../utils/hash.js";
import { ensureDir, pathExists, readTextFile, writeTextFile } from "../../utils/fs.js";
import { generateId, nowIso } from "../../utils/id.js";
import type { EventBus } from "../events/bus.js";
import type { Artifact, ArtifactFilter, ArtifactKind, ArtifactStorage } from "./types.js";

export class LocalFileStorage implements ArtifactStorage {
  constructor(private readonly rootDir: string = path.join(PATHS.root, ".runtime", "artifacts")) {}

  private resolve(storagePath: string): string {
    if (path.isAbsolute(storagePath)) return storagePath;
    return path.join(this.rootDir, storagePath);
  }

  async write(storagePath: string, content: string | Uint8Array): Promise<void> {
    const abs = this.resolve(storagePath);
    await ensureDir(path.dirname(abs));
    await writeTextFile(abs, typeof content === "string" ? content : Buffer.from(content).toString("utf8"));
  }

  async read(storagePath: string): Promise<string> {
    return readTextFile(this.resolve(storagePath));
  }

  async exists(storagePath: string): Promise<boolean> {
    return pathExists(this.resolve(storagePath));
  }
}

export interface RegisterArtifactInput {
  name: string;
  kind: ArtifactKind;
  owner: string;
  version?: string;
  content?: string;
  storagePath?: string;
  parentId?: string;
  relatedTo?: string[];
  metadata?: Record<string, unknown>;
}

export interface ArtifactManagerOptions {
  storage?: ArtifactStorage;
  bus?: EventBus;
}

/**
 * Phase 11 surface — registry of every artifact the runtime produces, plus
 * a pluggable storage backend for the bytes. Versioning is parent-pointer
 * based: `newVersion` creates a new id pointing at the predecessor, so the
 * version chain is reconstructible without a separate history field.
 */
export class ArtifactManager {
  private readonly artifacts = new Map<string, Artifact>();
  private readonly storage: ArtifactStorage;
  private readonly bus?: EventBus;

  constructor(options: ArtifactManagerOptions = {}) {
    this.storage = options.storage ?? new LocalFileStorage();
    this.bus = options.bus;
  }

  async register(input: RegisterArtifactInput): Promise<Artifact> {
    const id = generateId("art");
    const now = nowIso();
    const storagePath = input.storagePath ?? `${input.kind}/${id}.txt`;

    if (input.content !== undefined) {
      await this.storage.write(storagePath, input.content);
    }

    const artifact: Artifact = {
      id,
      name: input.name,
      kind: input.kind,
      owner: input.owner,
      version: input.version ?? "1.0.0",
      parentId: input.parentId,
      relatedTo: input.relatedTo ?? [],
      storagePath,
      contentHash: input.content ? contentHash(input.content) : undefined,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
    this.artifacts.set(id, artifact);

    void this.bus?.publish({
      name: "artifact.created",
      source: input.owner,
      payload: { id, name: input.name, kind: input.kind },
    });

    return artifact;
  }

  get(id: string): Artifact | undefined {
    return this.artifacts.get(id);
  }

  list(filter: ArtifactFilter = {}): Artifact[] {
    return [...this.artifacts.values()]
      .filter((artifact) => {
        if (filter.kind && artifact.kind !== filter.kind) return false;
        if (filter.owner && artifact.owner !== filter.owner) return false;
        if (filter.name && !artifact.name.includes(filter.name)) return false;
        if (filter.tag && artifact.metadata.tags) {
          const tags = artifact.metadata.tags as string[];
          if (!tags.includes(filter.tag)) return false;
        }
        return true;
      })
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  /** Creates a new version artifact pointing back to `parentId`. Bumps semver minor by default. */
  async newVersion(parentId: string, updates: Partial<RegisterArtifactInput>): Promise<Artifact> {
    const parent = this.artifacts.get(parentId);
    if (!parent) throw new Error(`Unknown parent artifact "${parentId}".`);
    const nextVersion = updates.version ?? bumpMinor(parent.version);
    const child = await this.register({
      name: updates.name ?? parent.name,
      kind: updates.kind ?? parent.kind,
      owner: updates.owner ?? parent.owner,
      version: nextVersion,
      content: updates.content,
      storagePath: updates.storagePath,
      parentId,
      relatedTo: updates.relatedTo ?? parent.relatedTo,
      metadata: { ...parent.metadata, ...(updates.metadata ?? {}) },
    });
    void this.bus?.publish({
      name: "artifact.updated",
      source: child.owner,
      payload: { id: child.id, parentId, version: nextVersion },
    });
    return child;
  }

  /** Records a bidirectional relationship between two artifacts. */
  link(a: string, b: string): void {
    const left = this.artifacts.get(a);
    const right = this.artifacts.get(b);
    if (!left || !right) throw new Error(`Cannot link unknown artifacts: ${a} ↔ ${b}.`);
    if (!left.relatedTo.includes(b)) left.relatedTo.push(b);
    if (!right.relatedTo.includes(a)) right.relatedTo.push(a);
    const now = nowIso();
    left.updatedAt = now;
    right.updatedAt = now;
  }

  /** Reconstructs the version chain rooted at the given artifact. */
  chain(id: string): Artifact[] {
    const ordered: Artifact[] = [];
    let current = this.artifacts.get(id);
    while (current) {
      ordered.unshift(current);
      current = current.parentId ? this.artifacts.get(current.parentId) : undefined;
    }
    return ordered;
  }

  storageBackend(): ArtifactStorage {
    return this.storage;
  }
}

function bumpMinor(version: string): string {
  const parts = version.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return `${version}.next`;
  return `${parts[0]}.${(parts[1] ?? 0) + 1}.0`;
}
