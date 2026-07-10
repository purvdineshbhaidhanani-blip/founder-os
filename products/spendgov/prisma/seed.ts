import { existsSync } from "node:fs";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const { seedPlans } = await import("../lib/services/billing.js");

/**
 * Idempotent seed: plan/entitlement definitions only — no demo
 * organizations or subscriptions, since those require a real signed-up
 * account to attach to (created via the actual signup flow, not seeded),
 * per standards/database.md's "seed data safe to re-run" rule.
 */
async function main() {
  await seedPlans();
  // eslint-disable-next-line no-console
  console.log("SpendGov: seeded plans (free, starter, pro, enterprise).");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
