import { PrismaClient } from ".prisma/codeaudit-client/index.js";

declare global {
  var __codeauditPrisma: PrismaClient | undefined;
}

/** Singleton pattern mirrors @founder-os/platform/db's Prisma client — avoids exhausting connections across Next.js hot reloads in dev. */
export function getCodeAuditDb(): PrismaClient {
  if (!globalThis.__codeauditPrisma) {
    globalThis.__codeauditPrisma = new PrismaClient();
  }
  return globalThis.__codeauditPrisma;
}
