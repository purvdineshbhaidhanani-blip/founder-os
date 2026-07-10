import { PrismaClient } from ".prisma/contactverify-client/index.js";

declare global {
  var __contactverifyPrisma: PrismaClient | undefined;
}

/** Singleton pattern mirrors @founder-os/platform/db's Prisma client — avoids exhausting connections across Next.js hot reloads in dev. */
export function getContactVerifyDb(): PrismaClient {
  if (!globalThis.__contactverifyPrisma) {
    globalThis.__contactverifyPrisma = new PrismaClient();
  }
  return globalThis.__contactverifyPrisma;
}
