import { PrismaClient } from ".prisma/authstartup-client/index.js";

declare global {
  var __authstartupPrisma: PrismaClient | undefined;
}

/** Singleton pattern mirrors @founder-os/platform/db's Prisma client — avoids exhausting connections across Next.js hot reloads in dev. */
export function getAuthStartupDb(): PrismaClient {
  if (!globalThis.__authstartupPrisma) {
    globalThis.__authstartupPrisma = new PrismaClient();
  }
  return globalThis.__authstartupPrisma;
}
