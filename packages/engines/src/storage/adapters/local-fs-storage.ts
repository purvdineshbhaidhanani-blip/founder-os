import { mkdir, readFile, writeFile, unlink, readdir, stat, access } from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";
import type { ObjectStorageProvider } from "../object-storage.js";
import type { FileMetadata, PutOptions, StoredObject } from "../types.js";

interface SidecarMetadata {
  contentType?: string;
  custom?: Record<string, string>;
}

/**
 * Stores objects as plain files on local disk, with a `.meta.json` sidecar
 * per object for content-type/custom metadata. Zero-dependency default —
 * ideal for local development and single-node deployments; swap for a cloud
 * adapter via `ObjectStorageProvider` when you need multi-node durability.
 */
export class LocalFsStorage implements ObjectStorageProvider {
  constructor(private readonly rootDir: string) {}

  private resolvePath(key: string): string {
    const normalized = path.normalize(key).replace(/^(\.\.[/\\])+/, "");
    return path.join(this.rootDir, normalized);
  }

  private sidecarPath(key: string): string {
    return `${this.resolvePath(key)}.meta.json`;
  }

  async put(key: string, data: Buffer, options: PutOptions = {}): Promise<FileMetadata> {
    const filePath = this.resolvePath(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    const sidecar: SidecarMetadata = { contentType: options.contentType, custom: options.metadata };
    await writeFile(this.sidecarPath(key), JSON.stringify(sidecar, null, 2));
    return this.buildMetadata(key, data.length, sidecar);
  }

  async get(key: string): Promise<StoredObject> {
    const data = await readFile(this.resolvePath(key));
    const sidecar = await this.readSidecar(key);
    return { data, metadata: this.buildMetadata(key, data.length, sidecar) };
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(this.resolvePath(key));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    await unlink(this.resolvePath(key)).catch(() => undefined);
    await unlink(this.sidecarPath(key)).catch(() => undefined);
  }

  async list(prefix = ""): Promise<FileMetadata[]> {
    const dir = this.resolvePath(prefix);
    const results: FileMetadata[] = [];
    await this.walk(dir, prefix, results);
    return results;
  }

  private async walk(dir: string, relativePrefix: string, results: FileMetadata[]): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const relativeKey = path.join(relativePrefix, entry.name).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        await this.walk(path.join(dir, entry.name), relativeKey, results);
      } else if (entry.isFile() && !entry.name.endsWith(".meta.json")) {
        const stats = await stat(path.join(dir, entry.name)).catch(() => undefined);
        if (!stats) continue;
        const sidecar = await this.readSidecar(relativeKey);
        results.push(this.buildMetadata(relativeKey, stats.size, sidecar, stats.mtime.toISOString()));
      }
    }
  }

  private async readSidecar(key: string): Promise<SidecarMetadata> {
    try {
      const raw = await readFile(this.sidecarPath(key), "utf-8");
      return JSON.parse(raw) as SidecarMetadata;
    } catch {
      return {};
    }
  }

  private buildMetadata(
    key: string,
    size: number,
    sidecar: SidecarMetadata,
    lastModified?: string,
  ): FileMetadata {
    return {
      key,
      size,
      contentType: sidecar.contentType,
      custom: sidecar.custom,
      lastModified: lastModified ?? new Date().toISOString(),
    };
  }
}
