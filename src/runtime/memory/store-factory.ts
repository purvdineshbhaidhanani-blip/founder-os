import type { MemoryStore } from "./types.js";
import { InMemoryStore } from "./store.js";
import { SupabaseMemoryStore } from "./supabase-store.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("memory.store-factory");

/**
 * Chooses the memory-backing store from the server runtime environment.
 *
 * When BOTH `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and
 * `SUPABASE_SERVICE_ROLE_KEY` are present, memory is durable (Supabase);
 * otherwise it falls back to the volatile `InMemoryStore` exactly as before —
 * so existing deployments and tests are unaffected (backward compatible).
 *
 * The `service_role` key is read here, server-side, and passed straight into
 * the store. It is never logged, never returned, and never reaches the
 * frontend bundle (this module is server-only).
 */
export function createMemoryStoreFromEnv(env: NodeJS.ProcessEnv = process.env): MemoryStore {
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && serviceRoleKey) {
    const store = new SupabaseMemoryStore({ url, serviceRoleKey });
    logger.info("using durable Supabase memory store", { host: store.endpointHost });
    return store;
  }

  if (url && !serviceRoleKey) {
    logger.warn(
      "SUPABASE_URL is set but SUPABASE_SERVICE_ROLE_KEY is not — falling back to volatile in-memory store",
    );
  }
  return new InMemoryStore();
}
