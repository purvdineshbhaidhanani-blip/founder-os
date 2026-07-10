import { getPlatformRedis } from "../db/redis.js";
import { conflictError } from "../errors/index.js";

/**
 * Idempotency-Key handling per standards/api.md: non-idempotent POSTs with
 * real-world side effects (payments, sending email, provisioning) accept an
 * Idempotency-Key header; repeated requests with the same key return the
 * original result rather than repeating the side effect.
 */

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60; // 24 hours — long enough to cover client retry storms, short enough not to leak forever

interface StoredResult {
  status: "in_progress" | "completed";
  responseBody?: unknown;
  responseStatus?: number;
}

function redisKey(scope: string, idempotencyKey: string): string {
  return `idempotency:${scope}:${idempotencyKey}`;
}

/**
 * Wraps a side-effecting operation so a repeated call with the same key
 * returns the cached result instead of re-running it. Uses a Redis SET NX
 * to claim the key atomically — a second concurrent request with the same
 * key fails fast with CONFLICT rather than racing the first request's side
 * effect.
 */
export async function withIdempotencyKey<T>(params: {
  scope: string;
  idempotencyKey: string | undefined;
  run: () => Promise<{ status: number; body: T }>;
}): Promise<{ status: number; body: T }> {
  if (!params.idempotencyKey) {
    return params.run();
  }

  const client = getPlatformRedis();
  const key = redisKey(params.scope, params.idempotencyKey);

  const claimed = await client.set(key, JSON.stringify({ status: "in_progress" } satisfies StoredResult), "EX", IDEMPOTENCY_TTL_SECONDS, "NX");

  if (claimed === null) {
    // Key already exists — either a concurrent in-flight request, or a completed one to replay.
    const existingRaw = await client.get(key);
    if (!existingRaw) {
      // Extremely narrow race: key expired between our failed claim and this read.
      throw conflictError("Idempotency key is being processed; please retry shortly.");
    }
    const existing = JSON.parse(existingRaw) as StoredResult;
    if (existing.status === "in_progress") {
      throw conflictError("A request with this Idempotency-Key is already in progress.");
    }
    return { status: existing.responseStatus ?? 200, body: existing.responseBody as T };
  }

  const result = await params.run();

  await client.set(
    key,
    JSON.stringify({ status: "completed", responseStatus: result.status, responseBody: result.body } satisfies StoredResult),
    "EX",
    IDEMPOTENCY_TTL_SECONDS,
  );

  return result;
}
