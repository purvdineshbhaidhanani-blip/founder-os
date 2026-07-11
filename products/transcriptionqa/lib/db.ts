import { PrismaClient } from ".prisma/transcriptionqa-client/index.js";

declare global {
  var __transcriptionqaPrisma: PrismaClient | undefined;
}

/** Singleton pattern mirrors @founder-os/platform/db's Prisma client — avoids exhausting connections across Next.js hot reloads in dev. */
export function getTranscriptionQADb(): PrismaClient {
  if (!globalThis.__transcriptionqaPrisma) {
    globalThis.__transcriptionqaPrisma = new PrismaClient();
  }
  return globalThis.__transcriptionqaPrisma;
}
