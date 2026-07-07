import type { IdentityStore } from "./store.js";
import { InMemoryIdentityStore } from "./in-memory-store.js";
import { PostgrestIdentityStore } from "./postgrest-store.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("identity.store-factory");

/**
 * Chooses the identity-backing store from the server runtime environment —
 * same convention as `createMemoryStoreFromEnv`: when BOTH `SUPABASE_URL`
 * and `SUPABASE_SERVICE_ROLE_KEY` are present, identity is durable
 * (Postgres via PostgREST); otherwise it falls back to the volatile
 * `InMemoryIdentityStore` (fine for local dev/tests, NOT for production —
 * every user/session/org would be lost on restart).
 */
export function createIdentityStoreFromEnv(env: NodeJS.ProcessEnv = process.env): IdentityStore {
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && serviceRoleKey) {
    logger.info("using durable Postgres-backed identity store");
    return new PostgrestIdentityStore({ url, serviceRoleKey });
  }

  if (url && !serviceRoleKey) {
    logger.warn("SUPABASE_URL is set but SUPABASE_SERVICE_ROLE_KEY is not — falling back to volatile in-memory identity store");
  } else {
    logger.warn("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set — using volatile in-memory identity store (not for production).");
  }
  return new InMemoryIdentityStore();
}
