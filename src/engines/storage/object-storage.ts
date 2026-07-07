import type { FileMetadata, PutOptions, StoredObject } from "./types.js";

/**
 * The contract every object storage backend must satisfy — local disk, S3,
 * GCS, Azure Blob, etc. `UploadManager`/`DownloadManager` and application
 * code depend only on this, never on a concrete backend SDK.
 */
export interface ObjectStorageProvider {
  put(key: string, data: Buffer, options?: PutOptions): Promise<FileMetadata>;
  get(key: string): Promise<StoredObject>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<FileMetadata[]>;
  /** Optional — implement when the backend supports time-limited direct-access URLs. */
  getSignedUrl?(key: string, expiresInSeconds: number): Promise<string>;
}
