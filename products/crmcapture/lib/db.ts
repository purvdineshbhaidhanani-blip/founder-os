import { PrismaClient } from ".prisma/crmcapture-client/index.js";

declare global {
  var __crmcapturePrisma: PrismaClient | undefined;
}

/** Singleton pattern mirrors @founder-os/platform/db's Prisma client — avoids exhausting connections across Next.js hot reloads in dev. */
export function getCRMCaptureDb(): PrismaClient {
  if (!globalThis.__crmcapturePrisma) {
    globalThis.__crmcapturePrisma = new PrismaClient();
  }
  return globalThis.__crmcapturePrisma;
}
