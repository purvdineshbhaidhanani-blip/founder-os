// Cross-platform portfolio orchestrator.
//
//   node start-portfolio.mjs [--no-bootstrap] [--no-open] [--production]
//
// 1. (unless --no-bootstrap) runs bootstrap.mjs to ensure DBs/env/migrations.
// 2. spawns the launcher (port 3000) and all 12 products (3001–3012), each
//    with a labeled, prefixed log stream, in this one process.
// 3. waits until every one of the 13 ports answers HTTP, printing progress.
// 4. (unless --no-open) opens http://localhost:3000 in the default browser.
// 5. keeps running; Ctrl+C stops every child process together.
//
// --production: builds each product once, then serves the optimized build
// (`next start`) instead of the dev server (`next dev`). Slower to first
// paint (builds up front) but uses dramatically less CPU/RAM once running —
// no on-demand compilation, no webpack watchers — and every page is instant.
// Recommended on machines that struggle to run 12 dev servers concurrently.
//
// The OS wrapper scripts (start-portfolio.cmd/.ps1/.sh) start Postgres/Redis
// first, then call this. Node built-ins only — no extra dependencies.

import { spawn } from "node:child_process";
import path from "node:path";
import { LAUNCHER_PORT, PRODUCTS } from "./portfolio.config.mjs";
import { REPO_ROOT, LAUNCHER_DIR, isWindows, log, openBrowser, run, waitForHttp } from "./lib.mjs";

const args = new Set(process.argv.slice(2));
const doBootstrap = !args.has("--no-bootstrap");
const doOpen = !args.has("--no-open");
const production = args.has("--production");

const children = [];
let shuttingDown = false;

function label(name, color) {
  // ANSI color prefix per process so interleaved logs stay readable.
  const c = color ? `\x1b[${color}m` : "";
  const r = color ? "\x1b[0m" : "";
  return (line) => `${c}[${name}]${r} ${line}`;
}

function spawnProc(name, cwd, cmd, cmdArgs, color) {
  const fmt = label(name, color);
  const child = spawn(cmd, cmdArgs, {
    cwd,
    shell: isWindows,
    env: process.env,
  });
  const pipe = (stream, out) => {
    let buf = "";
    stream.on("data", (d) => {
      buf += d;
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const l of lines) out.write(fmt(l) + "\n");
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);
  child.on("exit", (code) => {
    if (!shuttingDown) log(fmt(`exited with code ${code}`));
  });
  children.push(child);
  return child;
}

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  log("\nStopping all processes…");
  for (const c of children) {
    try {
      if (isWindows) spawn("taskkill", ["/pid", String(c.pid), "/T", "/F"], { shell: true });
      else c.kill("SIGTERM");
    } catch {
      /* best effort */
    }
  }
  setTimeout(() => process.exit(0), 1500);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function main() {
  if (doBootstrap) {
    log("== Bootstrapping (databases, env, migrations, seeds) ==");
    try {
      await run("node", [path.join(REPO_ROOT, "infrastructure", "launcher", "scripts", "bootstrap.mjs")]);
    } catch (err) {
      log(`\nBootstrap failed — cannot start the portfolio.\n${err.message}`);
      process.exit(1);
    }
  }

  if (production) {
    log("\n== Building all 12 products (--production) ==");
    log("   Building sequentially keeps CPU/RAM usage low; this takes a few minutes.\n");
    for (const p of PRODUCTS) {
      log(`   building ${p.id}…`);
      await run("npm", ["run", "build"], { cwd: path.join(REPO_ROOT, "products", p.id), quiet: true });
    }
    log("   All builds complete.\n");
  }

  log(`\n== Starting launcher + all 12 products (${production ? "production" : "dev"} mode) ==`);
  // Launcher (grey).
  spawnProc("launcher", LAUNCHER_DIR, "npm", ["start"], "90");
  // Products (cyan).
  const productScript = production ? "start" : "dev";
  for (const p of PRODUCTS) {
    spawnProc(p.id, path.join(REPO_ROOT, "products", p.id), "npm", ["run", productScript], "36");
  }

  log("\n== Waiting for every server to become reachable ==");
  log("   (first compile per app takes a few seconds; be patient)\n");

  // Warm/wait sequentially so each app's first compile gets CPU rather than
  // 13 competing at once — much faster to a fully-green portfolio.
  const targets = [{ id: "launcher", port: LAUNCHER_PORT }, ...PRODUCTS];
  let allUp = true;
  for (const t of targets) {
    const ok = await waitForHttp(t.port, { timeoutMs: 180000, intervalMs: 2000 });
    log(`   ${ok ? "✓ ONLINE " : "✗ TIMEOUT"}  http://localhost:${t.port}  (${t.id})`);
    if (!ok) allUp = false;
  }

  log("");
  if (allUp) {
    log("== All 13 servers are ONLINE ==");
    log("   Launcher:  http://localhost:3000");
    if (doOpen) openBrowser("http://localhost:3000");
  } else {
    log("== Some servers did not come up in time ==");
    log("   Check the labeled logs above. They may still be compiling; re-open");
    log("   http://localhost:3000 in a moment and refresh. Leaving processes running.");
  }
  log("\nProcesses are running. Press Ctrl+C to stop all of them.\n");
}

main();
