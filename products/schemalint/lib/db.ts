import { PrismaClient } from ".prisma/schemalint-client/index.js";

declare global {
  var __schemalintPrisma: PrismaClient | undefined;
}

/** Singleton pattern mirrors @founder-os/platform/db's Prisma client — avoids exhausting connections across Next.js hot reloads in dev. */
export function getSchemaLintDb(): PrismaClient {
  if (!globalThis.__schemalintPrisma) {
    globalThis.__schemalintPrisma = new PrismaClient();
  }
  return globalThis.__schemalintPrisma;
}
