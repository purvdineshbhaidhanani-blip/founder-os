import { pathExists, readJsonFile, writeJsonFile } from "../../utils/fs.js";
import type { MemoryEntry, MemoryNamespace, MemoryQuery, MemoryStore } from "./types.js";

function matchQuery(entries: MemoryEntry[], query: MemoryQuery): MemoryEntry[] {
  const now = Date.now();
  let out = query.includeExpired
    ? [...entries]
    : entries.filter((entry) => !entry.expiresAt || Date.parse(entry.expiresAt) > now);
  if (query.namespace) out = out.filter((entry) => entry.namespace === query.namespace);
  if (query.key) out = out.filter((entry) => entry.key === query.key);
  if (query.tag) out = out.filter((entry) => entry.tags.includes(query.tag!));
  if (query.since) {
    const sinceMs = Date.parse(query.since);
    out = out.filter((entry) => Date.parse(entry.updatedAt) >= sinceMs);
  }
  if (query.text) {
    const needle = query.text.toLowerCase();
    out = out.filter(
      (entry) =>
        entry.key.toLowerCase().includes(needle) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(needle)),
    );
  }
  out.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  return query.limit ? out.slice(0, query.limit) : out;
}

/** Volatile in-process store. Default for working memory; reset on every process restart. */
export class InMemoryStore implements MemoryStore {
  private readonly entries = new Map<string, MemoryEntry>();

  private key(namespace: MemoryNamespace, id: string): string {
    return `${namespace}:${id}`;
  }

  async get(namespace: MemoryNamespace, id: string): Promise<MemoryEntry | undefined> {
    return this.entries.get(this.key(namespace, id));
  }

  async list(query: MemoryQuery): Promise<MemoryEntry[]> {
    return matchQuery([...this.entries.values()], query);
  }

  async put(entry: MemoryEntry): Promise<void> {
    this.entries.set(this.key(entry.namespace, entry.id), entry);
  }

  async delete(namespace: MemoryNamespace, id: string): Promise<void> {
    this.entries.delete(this.key(namespace, id));
  }

  async clear(namespace?: MemoryNamespace): Promise<void> {
    if (!namespace) {
      this.entries.clear();
      return;
    }
    for (const [key, entry] of this.entries) {
      if (entry.namespace === namespace) this.entries.delete(key);
    }
  }
}

/** Single-file JSON store. Sufficient for project/task/conversation memory in MVP scale. */
export class JsonFileStore implements MemoryStore {
  constructor(private readonly filePath: string) {}

  private async load(): Promise<MemoryEntry[]> {
    if (!(await pathExists(this.filePath))) return [];
    return readJsonFile<MemoryEntry[]>(this.filePath);
  }

  private async save(entries: MemoryEntry[]): Promise<void> {
    await writeJsonFile(this.filePath, entries);
  }

  async get(namespace: MemoryNamespace, id: string): Promise<MemoryEntry | undefined> {
    const all = await this.load();
    return all.find((entry) => entry.namespace === namespace && entry.id === id);
  }

  async list(query: MemoryQuery): Promise<MemoryEntry[]> {
    return matchQuery(await this.load(), query);
  }

  async put(entry: MemoryEntry): Promise<void> {
    const all = await this.load();
    const idx = all.findIndex((e) => e.namespace === entry.namespace && e.id === entry.id);
    if (idx >= 0) all[idx] = entry;
    else all.push(entry);
    await this.save(all);
  }

  async delete(namespace: MemoryNamespace, id: string): Promise<void> {
    const all = await this.load();
    await this.save(all.filter((entry) => !(entry.namespace === namespace && entry.id === id)));
  }

  async clear(namespace?: MemoryNamespace): Promise<void> {
    const all = await this.load();
    await this.save(namespace ? all.filter((entry) => entry.namespace !== namespace) : []);
  }
}
