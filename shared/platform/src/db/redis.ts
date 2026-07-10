import { Redis } from "ioredis";
import { getPlatformEnv } from "../config/index.js";

/**
 * Single Redis client per process, mirroring db/index.ts's Prisma
 * singleton pattern — every module that needs Redis (rate limiting,
 * idempotency keys, AI response caching, search-result caching) shares one
 * connection instead of each opening its own.
 */
let client: Redis | undefined;

export function getPlatformRedis(): Redis {
  if (!client) {
    client = new Redis(getPlatformEnv().PLATFORM_REDIS_URL);
  }
  return client;
}
