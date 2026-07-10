import { Redis } from "ioredis";
import { getPlatformEnv } from "../config/index.js";
import { PlatformError } from "../errors/index.js";

let redis: Redis | undefined;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(getPlatformEnv().PLATFORM_REDIS_URL);
  }
  return redis;
}

/**
 * Sliding-window counter, sized per standards/security.md: "auth endpoints
 * strictest." Keys are namespaced by app so one product's login storm can't
 * exhaust another product's budget.
 */
export async function checkRateLimit(params: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const client = getRedis();
  const redisKey = `ratelimit:${params.key}`;
  const count = await client.incr(redisKey);
  if (count === 1) {
    await client.expire(redisKey, params.windowSeconds);
  }
  if (count > params.limit) {
    const ttl = await client.ttl(redisKey);
    return { allowed: false, retryAfterSeconds: ttl > 0 ? ttl : params.windowSeconds };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function enforceRateLimit(params: { key: string; limit: number; windowSeconds: number }): Promise<void> {
  const result = await checkRateLimit(params);
  if (!result.allowed) {
    throw new PlatformError("RATE_LIMITED", "Too many attempts. Please try again later.", {
      httpStatus: 429,
    });
  }
}

// Login attempts: 10 per 15 minutes per email — account lockout / exponential
// backoff surface per standards/security.md, applied per-account rather than
// only per-IP so a distributed attempt against one account is still caught.
export const LOGIN_RATE_LIMIT = { limit: 10, windowSeconds: 15 * 60 };

// Password reset / magic link requests: 5 per hour per email — expensive
// (sends email) and abuse-prone (email enumeration via response timing).
export const EMAIL_TOKEN_RATE_LIMIT = { limit: 5, windowSeconds: 60 * 60 };
