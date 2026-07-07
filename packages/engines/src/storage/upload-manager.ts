import type { ObjectStorageProvider } from "./object-storage.js";
import type { FileMetadata, ProgressCallback, PutOptions } from "./types.js";

export interface UploadOptions extends PutOptions {
  onProgress?: ProgressCallback;
}

/**
 * Thin orchestration layer over `ObjectStorageProvider.put` that adds
 * progress reporting and a hook point for pre-upload processing (e.g. a
 * media processing pipeline) — kept separate from the storage interface so
 * providers stay simple key/value stores.
 */
export class UploadManager {
  constructor(private readonly storage: ObjectStorageProvider) {}

  async upload(key: string, data: Buffer, options: UploadOptions = {}): Promise<FileMetadata> {
    options.onProgress?.(0);
    const metadata = await this.storage.put(key, data, options);
    options.onProgress?.(100);
    return metadata;
  }

  /** Uploads several objects, reporting overall progress across the batch. */
  async uploadMany(
    items: Array<{ key: string; data: Buffer; options?: PutOptions }>,
    onProgress?: ProgressCallback,
  ): Promise<FileMetadata[]> {
    const results: FileMetadata[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      results.push(await this.storage.put(item.key, item.data, item.options));
      onProgress?.(Math.round(((i + 1) / items.length) * 100));
    }
    return results;
  }
}
