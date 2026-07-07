import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { ObjectStorageProvider } from "./object-storage.js";
import type { ProgressCallback, StoredObject } from "./types.js";

export interface DownloadOptions {
  onProgress?: ProgressCallback;
}

/** Thin orchestration layer over `ObjectStorageProvider.get`, with a convenience path for writing to local disk. */
export class DownloadManager {
  constructor(private readonly storage: ObjectStorageProvider) {}

  async download(key: string, options: DownloadOptions = {}): Promise<StoredObject> {
    options.onProgress?.(0);
    const object = await this.storage.get(key);
    options.onProgress?.(100);
    return object;
  }

  async downloadToFile(key: string, destPath: string, options: DownloadOptions = {}): Promise<void> {
    const object = await this.download(key, options);
    await mkdir(path.dirname(destPath), { recursive: true });
    await writeFile(destPath, object.data);
  }
}
