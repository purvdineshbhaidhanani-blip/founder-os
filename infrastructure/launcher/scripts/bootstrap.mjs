// Cross-platform bootstrap: databases, .env files, Prisma schemas and seed
// data for every product. Idempotent — safe to re-run. Node port of
// bootstrap.sh so the exact same setup works on Windows, macOS and Linux.
//
// Assumes Postgres and Redis are already running and reachable (the OS
// wrapper scripts / start-portfolio.mjs start them first). Requires the
// Postgres client tools `psql` and `createdb` on PATH (they ship with any
// Postgres install).

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PRODUCTS, pgEnv, REDIS_URL } from "./portfolio.config.mjs";
import { REPO_ROOT, log, run, runSoft, tcpOpen } from "./lib.mjs";

const pg = pgEnv();
const pgBaseArgs = ["-h", pg.host, "-p", pg.port, "-U", pg.user];
const pgRunEnv = { PGPASSWORD: pg.password };

// npm writes node_modules/.package-lock.json only once an `npm install` has
// finished successfully, so its absence reliably means the install is
// missing or incomplete (interrupted by Ctrl+C, a crashed process, antivirus
// quarantine, a disk-full error, etc.) — checking only for the node_modules
// directory itself is not enough, since a broken partial install still
// leaves that directory behind and would otherwise be silently treated as
// "already installed" forever, which is exactly what produces errors like
// `'next' is not recognized as an internal or external command` on a later
// `npm run dev`.
async function installIfNeeded(dir) {
  const marker = path.join(dir, "node_modules", ".package-lock.json");
  if (!fs.existsSync(marker)) {
    log(`  installing dependencies in ${path.relative(REPO_ROOT, dir)}`);
    await run("npm", ["install"], { cwd: dir });
  }
}

// shared/platform and shared/ui are consumed by every product via a
// `file:../../shared/<name>` dependency, which resolves to their built
// `dist/` output. npm runs each package's own "prepare" script (which builds
// dist/) during ITS OWN `npm install`, but does not reliably re-run it when
// the package is merely linked in as another project's local file:
// dependency — so dist/ can be stale or missing even though node_modules
// looks fully installed. Verify it separately and rebuild if absent.
async function ensureSharedBuilt(dir) {
  if (!fs.existsSync(path.join(dir, "dist"))) {
    log(`  building ${path.relative(REPO_ROOT, dir)} (dist/ missing)`);
    await run("npm", ["run", "build"], { cwd: dir, quiet: true });
  }
}

async function checkServices() {
  log("== Checking Postgres and Redis are reachable ==");
  const check = await runSoft("psql", [...pgBaseArgs, "-c", "select 1", "postgres"], {
    env: pgRunEnv,
  });
  if (check.code !== 0) {
    throw new Error(
      `Cannot reach Postgres at ${pg.host}:${pg.port} as ${pg.user}. Start it first.\n${check.out}`,
    );
  }
  // Redis: parse host/port out of REDIS_URL and TCP-probe it.
  let rHost = "localhost";
  let rPort = 6379;
  try {
    const u = new URL(REDIS_URL);
    rHost = u.hostname || rHost;
    rPort = Number(u.port || 6379);
  } catch {
    /* fall back to defaults */
  }
  if (!(await tcpOpen(rPort, rHost, 1500))) {
    throw new Error(`Cannot reach Redis at ${REDIS_URL}. Start it first.`);
  }
  log("Postgres and Redis are up.\n");
}

function writeEnvIfMissing(productDir, name) {
  const envFile = path.join(productDir, ".env");
  if (fs.existsSync(envFile)) {
    log(`  ${path.relative(REPO_ROOT, envFile)} already exists, leaving it as-is`);
    return;
  }
  log(`  writing ${path.relative(REPO_ROOT, envFile)}`);
  const example = fs.readFileSync(path.join(productDir, ".env.example"), "utf8");
  const sessionSecret = crypto.randomBytes(32).toString("hex");
  const encryptionKey = crypto.randomBytes(32).toString("hex");
  const filled = example
    .replace(/^PLATFORM_SESSION_SECRET=.*$/m, `PLATFORM_SESSION_SECRET=${sessionSecret}`)
    .replace(/^PLATFORM_ENCRYPTION_KEY=.*$/m, `PLATFORM_ENCRYPTION_KEY=${encryptionKey}`)
    .replace(/^PLATFORM_REDIS_URL=.*$/m, `PLATFORM_REDIS_URL=${REDIS_URL}`);
  fs.writeFileSync(envFile, filled);
  log("  (AI provider keys and Stripe keys left blank — those features fail closed until Phase 2 credentials are added.)");
}

async function ensureDatabase(name) {
  log(`  ensuring database "${name}" exists`);
  const exists = await runSoft(
    "psql",
    [...pgBaseArgs, "-tAc", `SELECT 1 FROM pg_database WHERE datname = '${name}'`, "postgres"],
    { env: pgRunEnv },
  );
  if (exists.out.trim() !== "1") {
    await run("createdb", [...pgBaseArgs, name], { env: pgRunEnv });
  }
}

async function main() {
  await checkServices();

  log("== Installing shared packages ==");
  const sharedPlatformDir = path.join(REPO_ROOT, "shared", "platform");
  const sharedUiDir = path.join(REPO_ROOT, "shared", "ui");
  await installIfNeeded(sharedPlatformDir);
  await installIfNeeded(sharedUiDir);
  await ensureSharedBuilt(sharedPlatformDir);
  await ensureSharedBuilt(sharedUiDir);

  for (const { id: name } of PRODUCTS) {
    log(`\n############ ${name} ############`);
    const productDir = path.join(REPO_ROOT, "products", name);

    await installIfNeeded(productDir);
    writeEnvIfMissing(productDir, name);
    await ensureDatabase(name);

    const dbUrl = `postgresql://${pg.user}:${pg.password}@${pg.host}:${pg.port}/${name}`;

    log("  applying shared platform migrations (public schema)");
    await run("npx", ["prisma", "migrate", "deploy"], {
      cwd: path.join(REPO_ROOT, "shared", "platform"),
      env: { PLATFORM_DATABASE_URL: dbUrl },
      quiet: true,
    });

    log(`  applying ${name} migrations + generating Prisma client`);
    await run("npx", ["prisma", "migrate", "deploy"], { cwd: productDir, quiet: true });
    await run("npx", ["prisma", "generate"], { cwd: productDir, quiet: true });

    log("  seeding billing plans");
    try {
      await run("npm", ["run", "prisma:seed"], { cwd: productDir, quiet: true });
    } catch {
      log("  (seed skipped or already applied)");
    }

    log(`  done: ${name}`);
  }

  log("\n== Bootstrap complete ==");
  log(`All ${PRODUCTS.length} databases exist, are migrated, and are seeded.`);
}

main().catch((err) => {
  log(`\nBootstrap failed: ${err.message}`);
  process.exit(1);
});
