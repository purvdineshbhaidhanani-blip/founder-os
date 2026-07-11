import { PrismaClient } from ".prisma/characterconsistency-client/index.js";

declare global {
  var __characterconsistencyPrisma: PrismaClient | undefined;
}

/** Singleton pattern mirrors @founder-os/platform/db's Prisma client — avoids exhausting connections across Next.js hot reloads in dev. */
export function getCharacterConsistencyDb(): PrismaClient {
  if (!globalThis.__characterconsistencyPrisma) {
    globalThis.__characterconsistencyPrisma = new PrismaClient();
  }
  return globalThis.__characterconsistencyPrisma;
}
