import { PrismaClient } from ".prisma/erpaudit-client/index.js";

declare global {
  var __erpauditPrisma: PrismaClient | undefined;
}

/** Singleton pattern mirrors @founder-os/platform/db's Prisma client — avoids exhausting connections across Next.js hot reloads in dev. */
export function getERPAuditDb(): PrismaClient {
  if (!globalThis.__erpauditPrisma) {
    globalThis.__erpauditPrisma = new PrismaClient();
  }
  return globalThis.__erpauditPrisma;
}
