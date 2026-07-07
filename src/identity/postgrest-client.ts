import { createLogger } from "../utils/logger.js";

const logger = createLogger("identity.postgrest");
const REQUEST_TIMEOUT_MS = 10_000;

export interface PostgrestConfig {
  /** Project URL, with or without a trailing `/rest/v1`. */
  url: string;
  /** service_role key — server-side secret, injected via env. Bypasses RLS. */
  serviceRoleKey: string;
}

/** Thrown when a PostgREST request fails (non-2xx, network error, or timeout). */
export class PostgrestError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "PostgrestError";
  }
}

/** Normalizes a project URL to its PostgREST base (`<origin>/rest/v1`). */
export function toRestBase(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/rest/v1")) return trimmed;
  const withoutRest = trimmed.replace(/\/rest\/v1.*$/, "");
  return `${withoutRest}/rest/v1`;
}

/** PostgREST filter value, e.g. `eq.someone@example.com`, `in.(a,b,c)`. Build with the `eq`/`inList` helpers below. */
export type PostgrestFilter = string;

export function eq(value: string): PostgrestFilter {
  return `eq.${value}`;
}

export function inList(values: string[]): PostgrestFilter {
  return `in.(${values.join(",")})`;
}

export interface SelectOptions {
  filters?: Record<string, PostgrestFilter>;
  columns?: string;
  order?: string;
  limit?: number;
}

/**
 * Minimal PostgREST client over plain `fetch` — no Supabase SDK dependency,
 * mirroring the same "REST over HTTPS with the service_role key" approach
 * `SupabaseMemoryStore` uses for durable memory. Every `IdentityStore`
 * repository method in this module is a thin translation on top of
 * `select`/`insert`/`update`/`remove`.
 */
export class PostgrestClient {
  private readonly restBase: string;
  private readonly serviceRoleKey: string;

  constructor(config: PostgrestConfig) {
    if (!config.url) throw new Error("PostgrestClient requires a project url.");
    if (!config.serviceRoleKey) throw new Error("PostgrestClient requires a service_role key.");
    this.restBase = toRestBase(config.url);
    this.serviceRoleKey = config.serviceRoleKey;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      apikey: this.serviceRoleKey,
      Authorization: `Bearer ${this.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...extra,
    };
  }

  private async request(method: string, table: string, options: { query?: URLSearchParams; body?: unknown; headers?: Record<string, string> } = {}): Promise<Response> {
    const url = new URL(`${this.restBase}/${table}`);
    if (options.query) url.search = options.query.toString();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url.toString(), {
        method,
        headers: this.headers(options.headers),
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        logger.error("postgrest request failed", { method, table, status: response.status });
        throw new PostgrestError(`PostgREST ${method} ${table} failed (${response.status}): ${text}`, response.status);
      }
      return response;
    } catch (error) {
      if (error instanceof PostgrestError) throw error;
      throw new PostgrestError(`PostgREST ${method} ${table} request failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  async select<T>(table: string, options: SelectOptions = {}): Promise<T[]> {
    const query = new URLSearchParams();
    query.set("select", options.columns ?? "*");
    for (const [column, filter] of Object.entries(options.filters ?? {})) query.set(column, filter);
    if (options.order) query.set("order", options.order);
    if (options.limit !== undefined) query.set("limit", String(options.limit));

    const response = await this.request("GET", table, { query });
    return (await response.json()) as T[];
  }

  async selectOne<T>(table: string, options: SelectOptions = {}): Promise<T | null> {
    const rows = await this.select<T>(table, { ...options, limit: 1 });
    return rows[0] ?? null;
  }

  async insert<T>(table: string, row: Record<string, unknown>): Promise<T> {
    const response = await this.request("POST", table, {
      body: row,
      headers: { Prefer: "return=representation" },
    });
    const rows = (await response.json()) as T[];
    return rows[0]!;
  }

  async update<T>(table: string, filters: Record<string, PostgrestFilter>, patch: Record<string, unknown>): Promise<T[]> {
    const query = new URLSearchParams();
    for (const [column, filter] of Object.entries(filters)) query.set(column, filter);
    const response = await this.request("PATCH", table, {
      query,
      body: patch,
      headers: { Prefer: "return=representation" },
    });
    return (await response.json()) as T[];
  }

  async remove(table: string, filters: Record<string, PostgrestFilter>): Promise<void> {
    const query = new URLSearchParams();
    for (const [column, filter] of Object.entries(filters)) query.set(column, filter);
    await this.request("DELETE", table, { query });
  }

  async upsert<T>(table: string, row: Record<string, unknown>, onConflict: string): Promise<T> {
    const query = new URLSearchParams();
    query.set("on_conflict", onConflict);
    const response = await this.request("POST", table, {
      query,
      body: row,
      headers: { Prefer: "return=representation,resolution=merge-duplicates" },
    });
    const rows = (await response.json()) as T[];
    return rows[0]!;
  }
}
