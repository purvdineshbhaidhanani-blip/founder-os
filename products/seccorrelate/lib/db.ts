import { PrismaClient } from ".prisma/seccorrelate-client/index.js";

declare global {
  var __seccorrelatePrisma: PrismaClient | undefined;
}

/** Singleton pattern mirrors @founder-os/platform/db's Prisma client — avoids exhausting connections across Next.js hot reloads in dev. */
export function getSecCorrelateDb(): PrismaClient {
  if (!globalThis.__seccorrelatePrisma) {
    globalThis.__seccorrelatePrisma = new PrismaClient();
  }
  return globalThis.__seccorrelatePrisma;
}
