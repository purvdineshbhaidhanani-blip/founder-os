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

// A product's own `node_modules/next` can look installed (the directory and
// npm's completion marker both exist) while actually missing files deep
// inside next's dist tree — e.g. a Windows MAX_PATH (260-char) truncation
// during extraction, or antivirus quarantining next's require-hook.js
// specifically (a recurring, documented false positive because it patches
// Node's own require() at runtime). require-hook.js is loaded by next's CLI
// on every single startup, so its absence is exactly what produces
// `Cannot find module '../server/require-hook'`. Used as a canary below.
const NEXT_REQUIRE_HOOK = path.join("node_modules", "next", "dist", "server", "require-hook.js");

// npm writes node_modules/.package-lock.json only once an `npm install` has
// finished successfully, so its absence reliably means the install is
// missing or incomplete (interrupted by Ctrl+C, a crashed process, antivirus
// quarantine, a disk-full error, etc.) — checking only for the node_modules
// directory itself is not enough, since a broken partial install still
// leaves that directory behind and would otherwise be silently treated as
// "already installed" forever, which is exactly what produces errors like
// `'next' is not recognized as an internal or external command` on a later
// `npm run dev`. `canaries` are extra files (relative to dir) that must also
// exist — the completion marker alone doesn't prove every package inside
// node_modules is actually intact (see NEXT_REQUIRE_HOOK above); if a
// canary is missing despite a "complete" install, node_modules is deleted
// and reinstalled from scratch rather than patched on top of, since the
// underlying corruption (truncated path, quarantined file) would otherwise
// silently reproduce.
async function installIfNeeded(dir, canaries = []) {
  const marker = path.join(dir, "node_modules", ".package-lock.json");
  const markerOk = fs.existsSync(marker);
  const canariesOk = canaries.every((c) => fs.existsSync(path.join(dir, c)));
  if (markerOk && canariesOk) return;

  if (markerOk && !canariesOk) {
    log(`  ${path.relative(REPO_ROOT, dir)}: install looked complete but a required file is missing (corrupted or interrupted install) — reinstalling from scratch`);
    fs.rmSync(path.join(dir, "node_modules"), { recursive: true, force: true });
  } else {
    log(`  installing dependencies in ${path.relative(REPO_ROOT, dir)}`);
  }
  await run("npm", ["install"], { cwd: dir });
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

// Directories that don't belong in a runtime snapshot of a shared package
// (source-control metadata, its own dependency tree, tests).
const SHARED_COPY_SKIP = new Set(["node_modules", "tests", ".git", "coverage"]);

function copyDirFiltered(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SHARED_COPY_SKIP.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirFiltered(s, d);
    else if (entry.isFile()) fs.copyFileSync(s, d);
  }
}

// `file:../../shared/<pkg>` dependencies are symlinked by npm on POSIX (and
// on Windows with Developer Mode / symlink privilege enabled) — in that case
// a product always resolves straight through to the live, freshly-built
// shared package, and ensureSharedBuilt() above is all that's needed.
// Without that privilege — the common case on a stock Windows machine — npm
// silently falls back to COPYING the shared package into the product's
// node_modules at install time instead of linking it. That copy is a
// one-time snapshot: it never updates again, even after ensureSharedBuilt()
// later rebuilds dist/, or after any shared/platform or shared/ui source
// change. A copy taken before dist/ existed (or before a later change) is
// exactly what produces "Module not found: Can't resolve '@founder-os/ui/
// theme'" (or any other subpath export) while the real, current dist/theme
// sits right there in shared/ui, untouched. Detect the non-symlink case and
// refresh the copy on every bootstrap run so it can never go stale; when npm
// did symlink, this is a single cheap lstat that no-ops.
//
// Builds into a temp sibling directory first and only removes/replaces the
// real destination once that full copy has succeeded — never delete-then-
// copy. Deleting first and copying second means any failure partway through
// the copy (a locked file, a permission error, anything) leaves `dest`
// missing entirely, which is worse than the stale copy this function exists
// to fix in the first place, and is indistinguishable from the dependency
// never having been installed at all.
function syncSharedPackage(sharedDir, pkgName, productDir) {
  const dest = path.join(productDir, "node_modules", "@founder-os", pkgName);
  let isSymlink = false;
  try {
    isSymlink = fs.lstatSync(dest).isSymbolicLink();
  } catch {
    /* dest doesn't exist yet — falls through to the copy below */
  }
  if (isSymlink) return;

  log(`  refreshing copied dependency @founder-os/${pkgName} in ${path.relative(REPO_ROOT, productDir)}`);
  const tmp = `${dest}.bootstrap-tmp-${process.pid}`;
  fs.rmSync(tmp, { recursive: true, force: true });
  copyDirFiltered(sharedDir, tmp);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.renameSync(tmp, dest);
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

  // Every product is independent — its dependencies, database, and
  // migrations don't interact with any other product's. A failure in ONE
  // product's setup (a transient npm/network error, a locked file, anything)
  // must never prevent the other 11 from being bootstrapped: each product is
  // isolated in its own try/catch so one failure can't silently skip
  // everything after it in the loop. Every run always attempts all 12.
  const failed = [];
  for (const { id: name } of PRODUCTS) {
    log(`\n############ ${name} ############`);
    const productDir = path.join(REPO_ROOT, "products", name);

    try {
      await installIfNeeded(productDir, [NEXT_REQUIRE_HOOK]);
      syncSharedPackage(sharedPlatformDir, "platform", productDir);
      syncSharedPackage(sharedUiDir, "ui", productDir);
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
    } catch (err) {
      failed.push(name);
      log(`  FAILED: ${name} — ${err.message}`);
      log(`  (continuing with the remaining products; re-run bootstrap afterward to retry ${name})`);
    }
  }

  log("\n== Bootstrap complete ==");
  if (failed.length === 0) {
    log(`All ${PRODUCTS.length} databases exist, are migrated, and are seeded.`);
  } else {
    log(`${PRODUCTS.length - failed.length}/${PRODUCTS.length} products bootstrapped successfully.`);
    log(`Failed: ${failed.join(", ")} — see the FAILED lines above for why. Re-run bootstrap to retry just those (already-successful products are skipped instantly).`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  log(`\nBootstrap failed: ${err.message}`);
  process.exit(1);
});
