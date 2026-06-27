import type { Timestamp } from "../../types/common.js";

export type ArtifactKind = "code" | "document" | "report" | "plan" | "data" | "image" | (string & {});

export interface Artifact {
  id: string;
  name: string;
  kind: ArtifactKind;
  owner: string;
  version: string;
  /** Previous version id, if this is an update. */
  parentId?: string;
  /** Other artifacts this one references (cross-links). */
  relatedTo: string[];
  storagePath: string;
  contentHash?: string;
  metadata: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ArtifactFilter {
  kind?: ArtifactKind;
  owner?: string;
  name?: string;
  tag?: string;
}

/**
 * Storage abstraction so artifact bytes can live anywhere — local disk,
 * S3-style buckets, etc. The manager only persists metadata; bytes are the
 * caller's responsibility, addressed by `storagePath`.
 */
export interface ArtifactStorage {
  write(storagePath: string, content: string | Uint8Array): Promise<void>;
  read(storagePath: string): Promise<string>;
  exists(storagePath: string): Promise<boolean>;
}
