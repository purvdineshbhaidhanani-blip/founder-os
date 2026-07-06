import type { MemoryEntry, MemoryNamespace, MemoryQuery, MemoryStore } from "./types.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("memory.supabase");

/**
 * Durable {@link MemoryStore} backed by Supabase (PostgREST over HTTPS).
 *
 * Design constraints:
 *  - Implements the EXISTING `MemoryStore` interface unchanged, so it is a
 *    drop-in for `InMemoryStore`/`JsonFileStore` — the rest of the runtime is
 *    unaware of the backing store.
 *  - Reads the `service_role` key from the SERVER runtime environment only
 *    (never a bundled constant, never logged, never sent to the frontend).
 *  - Uses the global `fetch` — no new dependency, no Supabase SDK.
 *  - Reproduces `store.ts`'s `matchQuery` semantics EXACTLY: the exact-match
 *    filters (namespace/key/tag/since/expiry) run server-side; the substring
 *    `text` filter and the final `limit` are applied in-process AFTER sorting
 *    by `updated_at` descending, identical to the in-memory implementation.
 *
 * Table: `founder_os_memory` (composite primary key `(namespace, id)`), created
 * by `supabase/migrations/0001_founder_os_memory.sql`.
 */

const TABLE = "founder_os_memory";
const REQUEST_TIMEOUT_MS = 10000;

/** Raw row shape as returned by PostgREST (snake_case columns). */
interface MemoryRow {
  id: string;
  namespace: string;
  key: string;
  data: unknown;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export interface SupabaseStoreConfig {
  /** Project URL, with or without a trailing `/rest/v1`. */
  url: string;
  /** service_role key — server-side secret, injected via env. */
  serviceRoleKey: string;
}

/** Thrown by `ensureSchema` when the backing table does not exist yet. */
export class SupabaseSchemaMissingError extends Error {
  constructor(public readonly sqlPath: string) {
    super(
      `Supabase table "${TABLE}" is missing. Apply the migration once via the ` +
        `Supabase SQL editor (or CLI): ${sqlPath}`,
    );
    this.name = "SupabaseSchemaMissingError";
  }
}

/** Normalizes a project URL to its PostgREST base (`<origin>/rest/v1`). */
export function toRestBase(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/rest/v1")) return trimmed;
  const withoutRest = trimmed.replace(/\/rest\/v1.*$/, "");
  return `${withoutRest}/rest/v1`;
}

function rowToEntry(row: MemoryRow): MemoryEntry {
  return {
    id: row.id,
    namespace: row.namespace as MemoryNamespace,
    key: row.key,
    data: row.data,
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.expires_at ? { expiresAt: row.expires_at } : {}),
  };
}

function entryToRow(entry: MemoryEntry): MemoryRow {
  return {
    id: entry.id,
    namespace: entry.namespace,
    key: entry.key,
    data: entry.data,
    tags: entry.tags,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
    expires_at: entry.expiresAt ?? null,
  };
}

export class SupabaseMemoryStore implements MemoryStore {
  private readonly restBase: string;
  private readonly serviceRoleKey: string;

  constructor(config: SupabaseStoreConfig) {
    if (!config.url) throw new Error("SupabaseMemoryStore requires a project url.");
    if (!config.serviceRoleKey) throw new Error("SupabaseMemoryStore requires a service_role key.");
    this.restBase = toRestBase(config.url);
    this.serviceRoleKey = config.serviceRoleKey;
  }

  /** Host only — safe to log (never includes the key). */
  get endpointHost(): string {
    try {
      return new URL(this.restBase).host;
    } catch {
      return "invalid-url";
    }
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(`${this.restBase}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          apikey: this.serviceRoleKey,
          Authorization: `Bearer ${this.serviceRoleKey}`,
          "Content-Type": "application/json",
          ...init.headers,
        },
      });
    } finally {
      clearTimeout(timer);
    }
  }

  /** Reads the response body once, never echoing request headers (so the key can never leak into an error string). */
  private async failure(res: Response, action: string): Promise<Error> {
    let detail = res.statusText;
    try {
      detail = (await res.text()).slice(0, 500) || res.statusText;
    } catch {
      /* ignore body-read errors */
    }
    return new Error(`Supabase ${action} failed (${res.status}): ${detail}`);
  }

  async get(namespace: MemoryNamespace, id: string): Promise<MemoryEntry | undefined> {
    const params = new URLSearchParams({
      select: "*",
      namespace: `eq.${namespace}`,
      id: `eq.${id}`,
      limit: "1",
    });
    const res = await this.request(`/${TABLE}?${params.toString()}`);
    if (!res.ok) throw await this.failure(res, "get");
    const rows = (await res.json()) as MemoryRow[];
    const row = rows[0];
    return row ? rowToEntry(row) : undefined;
  }

  async list(query: MemoryQuery): Promise<MemoryEntry[]> {
    const params = new URLSearchParams();
    params.set("select", "*");
    params.set("order", "updated_at.desc");
    if (query.namespace) params.append("namespace", `eq.${query.namespace}`);
    if (query.key) params.append("key", `eq.${query.key}`);
    if (query.tag) params.append("tags", `cs.{${query.tag}}`);
    if (query.since) params.append("updated_at", `gte.${query.since}`);
    if (!query.includeExpired) {
      params.append("or", `(expires_at.is.null,expires_at.gt.${new Date().toISOString()})`);
    }

    const res = await this.request(`/${TABLE}?${params.toString()}`);
    if (!res.ok) throw await this.failure(res, "list");
    const rows = (await res.json()) as MemoryRow[];
    let out = rows.map(rowToEntry);

    // Substring `text` and the final `limit` are applied here to match
    // store.ts's matchQuery exactly (limit slices AFTER text filtering, and
    // text matches a substring of the key OR of any tag — which PostgREST
    // cannot express over an array element).
    if (query.text) {
      const needle = query.text.toLowerCase();
      out = out.filter(
        (entry) =>
          entry.key.toLowerCase().includes(needle) ||
          entry.tags.some((tag) => tag.toLowerCase().includes(needle)),
      );
    }
    return query.limit ? out.slice(0, query.limit) : out;
  }

  async put(entry: MemoryEntry): Promise<void> {
    // Upsert on the composite primary key so a repeated `remember` with the
    // same (namespace, id) overwrites in place — matching InMemoryStore.
    const res = await this.request(`/${TABLE}?on_conflict=namespace,id`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(entryToRow(entry)),
    });
    if (!res.ok) throw await this.failure(res, "put");
  }

  async delete(namespace: MemoryNamespace, id: string): Promise<void> {
    const params = new URLSearchParams({ namespace: `eq.${namespace}`, id: `eq.${id}` });
    const res = await this.request(`/${TABLE}?${params.toString()}`, { method: "DELETE" });
    if (!res.ok) throw await this.failure(res, "delete");
  }

  async clear(namespace?: MemoryNamespace): Promise<void> {
    const params = new URLSearchParams();
    // PostgREST refuses an unfiltered DELETE; `namespace=not.is.null` matches
    // every row for the clear-all case.
    if (namespace) params.set("namespace", `eq.${namespace}`);
    else params.set("namespace", "not.is.null");
    const res = await this.request(`/${TABLE}?${params.toString()}`, { method: "DELETE" });
    if (!res.ok) throw await this.failure(res, "clear");
  }

  /**
   * Probes that the backing table is reachable. Resolves silently when it is;
   * throws {@link SupabaseSchemaMissingError} when the table does not exist so
   * the operator applies the one-time migration. Any other error (auth,
   * network) is rethrown as-is.
   */
  async ensureSchema(sqlPath = "supabase/migrations/0001_founder_os_memory.sql"): Promise<void> {
    const res = await this.request(`/${TABLE}?select=id&limit=1`);
    if (res.ok) return;
    if (res.status === 404) throw new SupabaseSchemaMissingError(sqlPath);
    const body = (await res.text().catch(() => "")).toLowerCase();
    // PostgREST reports a missing relation as PGRST205 / "does not exist".
    if (body.includes("does not exist") || body.includes("pgrst205")) {
      throw new SupabaseSchemaMissingError(sqlPath);
    }
    throw await this.failure(res, "ensureSchema");
  }

  /** Lightweight connectivity check for startup diagnostics. Never logs the key. */
  async verifyConnection(): Promise<{ ok: boolean; detail: string }> {
    try {
      await this.ensureSchema();
      logger.info("supabase memory store connected", { host: this.endpointHost, table: TABLE });
      return { ok: true, detail: `connected to ${this.endpointHost}/${TABLE}` };
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown error";
      logger.error("supabase memory store connection failed", { host: this.endpointHost, detail });
      return { ok: false, detail };
    }
  }
}
