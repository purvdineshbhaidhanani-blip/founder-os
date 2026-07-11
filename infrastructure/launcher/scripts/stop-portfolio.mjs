// Cross-platform "stop everything": frees ports 3000–3012 by killing whatever
// process is listening on each. Node built-ins + platform-native lookup only.
//
//   node stop-portfolio.mjs
//
// Does NOT stop Postgres or Redis (other things may depend on them). The OS
// wrapper scripts stop those separately if desired.

import { ALL_PORTS } from "./portfolio.config.mjs";
import { isWindows, log, runSoft } from "./lib.mjs";

async function pidsOnPort(port) {
  if (isWindows) {
    const { out } = await runSoft("netstat", ["-ano", "-p", "tcp"]);
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      // e.g.  TCP    0.0.0.0:3001   0.0.0.0:0   LISTENING   1234
      const m = line.match(/:(\d+)\s+\S+\s+LISTENING\s+(\d+)/);
      if (m && Number(m[1]) === port) pids.add(m[2]);
    }
    return [...pids];
  }
  // Unix: prefer lsof, fall back to fuser. Keep only numeric PIDs so labels
  // that fuser prints to stderr (e.g. "3001/tcp:") are never treated as PIDs.
  let { out, code } = await runSoft("lsof", ["-ti", `tcp:${port}`]);
  if (code !== 0 || !out.trim()) {
    ({ out } = await runSoft("fuser", [`${port}/tcp`]));
  }
  return out.split(/\s+/).map((s) => s.trim()).filter((s) => /^\d+$/.test(s));
}

async function kill(pid) {
  if (isWindows) await runSoft("taskkill", ["/pid", pid, "/T", "/F"]);
  else await runSoft("kill", ["-9", pid]);
}

async function main() {
  let killed = 0;
  for (const port of ALL_PORTS) {
    const pids = await pidsOnPort(port);
    for (const pid of pids) {
      await kill(pid);
      log(`  stopped process ${pid} on port ${port}`);
      killed++;
    }
  }
  log(killed ? `\nStopped ${killed} process(es).` : "\nNothing was running on ports 3000–3012.");
}

main();
