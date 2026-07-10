import { getPlatformDb } from "../db/index.js";
import { getPlatformRedis } from "../db/redis.js";

export interface HealthCheckResult {
  status: "healthy" | "unhealthy";
  checks: {
    database: "ok" | "error";
    redis: "ok" | "error";
  };
  timestamp: string;
}

/**
 * Health check per standards/devops.md — the `/health` and `/ready`
 * endpoints every product exposes call this rather than reimplementing
 * dependency checks per product.
 */
export async function checkHealth(): Promise<HealthCheckResult> {
  const [databaseOk, redisOk] = await Promise.all([checkDatabase(), checkRedis()]);

  const status = databaseOk && redisOk ? "healthy" : "unhealthy";

  return {
    status,
    checks: {
      database: databaseOk ? "ok" : "error",
      redis: redisOk ? "ok" : "error",
    },
    timestamp: new Date().toISOString(),
  };
}

async function checkDatabase(): Promise<boolean> {
  try {
    await getPlatformDb().$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function checkRedis(): Promise<boolean> {
  try {
    const pong = await getPlatformRedis().ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}
