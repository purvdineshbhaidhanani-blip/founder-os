import { PrismaClient } from "@prisma/client";
import { getPlatformEnv } from "../config/index.js";

/**
 * Single Prisma client per process, per standards/engineering.md's
 * "query layer, never raw queries scattered in routes" rule — every
 * platform module imports this instead of instantiating its own client.
 */
let client: PrismaClient | undefined;

export function getPlatformDb(): PrismaClient {
  if (!client) {
    client = new PrismaClient({
      log: process.env.NODE_ENV === "production" ? ["error", "warn"] : ["error", "warn", "query"],
    });
  }
  return client;
}

/**
 * Returns the current process's app scope (which product's tenant space
 * this service instance serves) — see shared/platform/ARCHITECTURE.md's
 * "Multi-app isolation" section. Every platform query filters by this.
 */
export function currentAppId(): string {
  return getPlatformEnv().PLATFORM_APP_ID;
}
