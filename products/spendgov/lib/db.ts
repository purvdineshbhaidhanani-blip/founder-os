import { PrismaClient } from ".prisma/spendgov-client/index.js";

declare global {
  var __spendgovPrisma: PrismaClient | undefined;
}

/** Singleton pattern mirrors @founder-os/platform/db's Prisma client — avoids exhausting connections across Next.js hot reloads in dev. */
export function getSpendGovDb(): PrismaClient {
  if (!globalThis.__spendgovPrisma) {
    globalThis.__spendgovPrisma = new PrismaClient();
  }
  return globalThis.__spendgovPrisma;
}
