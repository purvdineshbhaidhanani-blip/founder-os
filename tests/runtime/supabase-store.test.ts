import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SupabaseMemoryStore,
  SupabaseSchemaMissingError,
  toRestBase,
} from "../../src/runtime/memory/supabase-store.js";
import { createMemoryStoreFromEnv } from "../../src/runtime/memory/store-factory.js";
import { InMemoryStore } from "../../src/runtime/memory/store.js";
import type { MemoryEntry } from "../../src/runtime/memory/types.js";

interface FetchCall {
  url: string;
  init: RequestInit;
}

function mockFetch(handler: (call: FetchCall) => { status?: number; ok?: boolean; body?: unknown; text?: string }) {
  const calls: FetchCall[] = [];
  const fn = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const res = handler({ url, init });
    const status = res.status ?? 200;
    return {
      ok: res.ok ?? (status >= 200 && status < 300),
      status,
      statusText: "",
      json: async () => res.body ?? [],
      text: async () => res.text ?? JSON.stringify(res.body ?? ""),
    } as unknown as Response;
  });
  vi.stubGlobal("fetch", fn);
  return calls;
}

function entry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: "id-1",
    namespace: "project",
    key: "k",
    data: { hello: "world" },
    tags: ["research"],
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

const CONFIG = { url: "https://proj.supabase.co", serviceRoleKey: "sb_secret_TESTKEY" };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("toRestBase", () => {
  it("normalizes bare and /rest/v1 URLs to the PostgREST base", () => {
    expect(toRestBase("https://proj.supabase.co")).toBe("https://proj.supabase.co/rest/v1");
    expect(toRestBase("https://proj.supabase.co/")).toBe("https://proj.supabase.co/rest/v1");
    expect(toRestBase("https://proj.supabase.co/rest/v1/")).toBe("https://proj.supabase.co/rest/v1");
  });
});

describe("createMemoryStoreFromEnv", () => {
  it("returns InMemoryStore when Supabase env is absent (backward compatible)", () => {
    expect(createMemoryStoreFromEnv({})).toBeInstanceOf(InMemoryStore);
  });
  it("returns InMemoryStore when the url is set but the key is missing", () => {
    expect(createMemoryStoreFromEnv({ SUPABASE_URL: "https://x.supabase.co" })).toBeInstanceOf(InMemoryStore);
  });
  it("returns a SupabaseMemoryStore when both url and service_role key are present", () => {
    const store = createMemoryStoreFromEnv({
      SUPABASE_URL: "https://x.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_x",
    });
    expect(store).toBeInstanceOf(SupabaseMemoryStore);
  });
});

describe("SupabaseMemoryStore", () => {
  it("sends the service_role key as apikey + bearer, and never in the URL", async () => {
    const calls = mockFetch(() => ({ body: [] }));
    const store = new SupabaseMemoryStore(CONFIG);
    await store.list({});
    const call = calls[0]!;
    expect(call.url).not.toContain("sb_secret");
    const headers = call.init.headers as Record<string, string>;
    expect(headers.apikey).toBe("sb_secret_TESTKEY");
    expect(headers.Authorization).toBe("Bearer sb_secret_TESTKEY");
  });

  it("upserts on the composite key via merge-duplicates", async () => {
    const calls = mockFetch(() => ({ status: 201 }));
    const store = new SupabaseMemoryStore(CONFIG);
    await store.put(entry());
    const call = calls[0]!;
    expect(call.url).toContain("/founder_os_memory?on_conflict=namespace,id");
    expect(call.init.method).toBe("POST");
    expect((call.init.headers as Record<string, string>).Prefer).toContain("merge-duplicates");
    const row = JSON.parse(call.init.body as string);
    expect(row).toMatchObject({ id: "id-1", namespace: "project", key: "k", tags: ["research"], expires_at: null });
  });

  it("maps a returned row back into a MemoryEntry on get", async () => {
    mockFetch(() => ({
      body: [
        {
          id: "id-1",
          namespace: "project",
          key: "k",
          data: { a: 1 },
          tags: ["t"],
          created_at: "2026-07-01T00:00:00.000Z",
          updated_at: "2026-07-02T00:00:00.000Z",
          expires_at: null,
        },
      ],
    }));
    const store = new SupabaseMemoryStore(CONFIG);
    const got = await store.get("project", "id-1");
    expect(got).toMatchObject({ id: "id-1", namespace: "project", tags: ["t"], updatedAt: "2026-07-02T00:00:00.000Z" });
    expect(got?.expiresAt).toBeUndefined();
  });

  it("returns undefined from get when no row matches", async () => {
    mockFetch(() => ({ body: [] }));
    const store = new SupabaseMemoryStore(CONFIG);
    expect(await store.get("project", "missing")).toBeUndefined();
  });

  it("builds server filters for namespace/tag and excludes expired by default", async () => {
    const calls = mockFetch(() => ({ body: [] }));
    const store = new SupabaseMemoryStore(CONFIG);
    await store.list({ namespace: "project", tag: "research" });
    const url = calls[0]!.url;
    expect(url).toContain("namespace=eq.project");
    expect(url).toContain(encodeURIComponent("cs.{research}"));
    expect(url).toContain("order=updated_at.desc");
    expect(url).toContain("expires_at.is.null");
  });

  it("applies the substring text filter and limit in-process (matchQuery parity)", async () => {
    mockFetch(() => ({
      body: [
        { id: "1", namespace: "project", key: "alpha", data: {}, tags: [], created_at: "t", updated_at: "2026-07-03T00:00:00Z", expires_at: null },
        { id: "2", namespace: "project", key: "beta", data: {}, tags: ["alpha-tag"], created_at: "t", updated_at: "2026-07-02T00:00:00Z", expires_at: null },
        { id: "3", namespace: "project", key: "gamma", data: {}, tags: [], created_at: "t", updated_at: "2026-07-01T00:00:00Z", expires_at: null },
      ],
    }));
    const store = new SupabaseMemoryStore(CONFIG);
    const out = await store.list({ text: "alpha", limit: 1 });
    // "alpha" matches row 1 (key) and row 2 (tag); limit 1 keeps the first.
    expect(out).toHaveLength(1);
    expect(out[0]!.id).toBe("1");
  });

  it("refuses an unfiltered clear by scoping to not.is.null", async () => {
    const calls = mockFetch(() => ({ status: 204 }));
    const store = new SupabaseMemoryStore(CONFIG);
    await store.clear();
    expect(calls[0]!.url).toContain("namespace=not.is.null");
    expect(calls[0]!.init.method).toBe("DELETE");
  });

  it("throws SupabaseSchemaMissingError when the table does not exist (404)", async () => {
    mockFetch(() => ({ status: 404, ok: false, text: "relation does not exist" }));
    const store = new SupabaseMemoryStore(CONFIG);
    await expect(store.ensureSchema()).rejects.toBeInstanceOf(SupabaseSchemaMissingError);
  });

  it("verifyConnection reports failure without throwing and never leaks the key", async () => {
    mockFetch(() => ({ status: 401, ok: false, text: "unauthorized" }));
    const store = new SupabaseMemoryStore(CONFIG);
    const result = await store.verifyConnection();
    expect(result.ok).toBe(false);
    expect(result.detail).not.toContain("sb_secret");
  });
});
