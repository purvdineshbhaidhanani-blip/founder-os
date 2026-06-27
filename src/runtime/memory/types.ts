import type { Timestamp } from "../../types/common.js";

/**
 * The six memory namespaces the runtime distinguishes. Working memory is
 * volatile and per-execution; everything else can outlive a single run.
 */
export type MemoryNamespace =
  | "working"
  | "project"
  | "task"
  | "agent"
  | "artifact"
  | "conversation";

export interface MemoryEntry<T = unknown> {
  id: string;
  namespace: MemoryNamespace;
  /** Partition within the namespace, e.g. taskId for "task", agentName for "agent". */
  key: string;
  data: T;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  expiresAt?: Timestamp;
}

export interface MemoryQuery {
  namespace?: MemoryNamespace;
  key?: string;
  tag?: string;
  /** Substring match against key + tags (case-insensitive). */
  text?: string;
  since?: Timestamp;
  limit?: number;
  /** When true, returns entries even if `expiresAt` has passed. Default: false. */
  includeExpired?: boolean;
}

/**
 * Storage abstraction; the engine never calls a concrete store directly.
 * Implementations: InMemoryStore (volatile), JsonFileStore (durable).
 */
export interface MemoryStore {
  get(namespace: MemoryNamespace, id: string): Promise<MemoryEntry | undefined>;
  list(query: MemoryQuery): Promise<MemoryEntry[]>;
  put(entry: MemoryEntry): Promise<void>;
  delete(namespace: MemoryNamespace, id: string): Promise<void>;
  clear(namespace?: MemoryNamespace): Promise<void>;
}
