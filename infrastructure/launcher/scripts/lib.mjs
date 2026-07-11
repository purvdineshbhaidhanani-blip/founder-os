// Small cross-platform helpers shared by the bootstrap/start/stop scripts.
// Pure Node built-ins — no dependencies, works identically on Windows,
// macOS and Linux.

import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Repo root is two levels up from infrastructure/launcher/scripts.
export const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
export const LAUNCHER_DIR = path.resolve(__dirname, "..");

export const isWindows = process.platform === "win32";
// On Windows, npm/npx are .cmd shims and must be invoked via the shell.
export const npm = isWindows ? "npm.cmd" : "npm";
export const npx = isWindows ? "npx.cmd" : "npx";

export function log(msg) {
  process.stdout.write(msg + "\n");
}

// Run a command to completion, inheriting stdio. Rejects on non-zero exit.
export function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: opts.quiet ? ["ignore", "pipe", "pipe"] : "inherit",
      shell: isWindows, // needed for .cmd shims on Windows
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
    });
    let out = "";
    if (opts.quiet) {
      child.stdout.on("data", (d) => (out += d));
      child.stderr.on("data", (d) => (out += d));
    }
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`${cmd} ${args.join(" ")} exited ${code}\n${out}`));
    });
  });
}

// Like run(), but resolves with { code, out } instead of rejecting, so callers
// can branch on the exit code (used for "does this database exist?" checks).
export function runSoft(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: isWindows,
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
    });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("error", () => resolve({ code: -1, out }));
    child.on("close", (code) => resolve({ code, out }));
  });
}

// True if a TCP connection to host:port succeeds within `timeout` ms.
export function tcpOpen(port, host = "127.0.0.1", timeout = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, host);
  });
}

// True if GET http://host:port/ returns any HTTP response (server is up and
// serving), within `timeout` ms.
export function httpOk(port, host = "127.0.0.1", timeout = 4000) {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path: "/", timeout }, (res) => {
      res.resume();
      resolve(res.statusCode > 0);
    });
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.on("error", () => resolve(false));
  });
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Poll httpOk(port) until it succeeds or the deadline passes.
export async function waitForHttp(port, { timeoutMs = 180000, intervalMs = 2000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await httpOk(port)) return true;
    await sleep(intervalMs);
  }
  return false;
}

// Open a URL in the default browser, best-effort (never throws).
export function openBrowser(url) {
  try {
    const cmd = isWindows ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
    const args = isWindows ? ["/c", "start", "", url] : [url];
    spawn(cmd, args, { stdio: "ignore", detached: true, shell: isWindows }).unref();
  } catch {
    /* opening a browser is a convenience, not a hard requirement */
  }
}
