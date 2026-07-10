import { PrismaClient } from ".prisma/incidenttriage-client/index.js";

declare global {
  var __incidenttriagePrisma: PrismaClient | undefined;
}

/** Singleton pattern mirrors @founder-os/platform/db's Prisma client — avoids exhausting connections across Next.js hot reloads in dev. */
export function getIncidentTriageDb(): PrismaClient {
  if (!globalThis.__incidenttriagePrisma) {
    globalThis.__incidenttriagePrisma = new PrismaClient();
  }
  return globalThis.__incidenttriagePrisma;
}
