import { PrismaClient } from ".prisma/payrollaudit-client/index.js";

declare global {
  var __payrollauditPrisma: PrismaClient | undefined;
}

/** Singleton pattern mirrors @founder-os/platform/db's Prisma client — avoids exhausting connections across Next.js hot reloads in dev. */
export function getPayrollAuditDb(): PrismaClient {
  if (!globalThis.__payrollauditPrisma) {
    globalThis.__payrollauditPrisma = new PrismaClient();
  }
  return globalThis.__payrollauditPrisma;
}
