import { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";
import { PATHS } from "../../constants/paths.js";
import { loadFounderConfig } from "../../settings/founder-config.js";
import { OllamaProvider } from "../../llm/ollama-provider.js";
import { composeFounderRuntime } from "../founder-runtime.js";
import { stdout } from "../output.js";

interface DiagnosticResult {
  name: string;
  ok: boolean;
  detail: string;
  critical: boolean;
}

async function checkWorkspace(workspaceRoot: string): Promise<DiagnosticResult> {
  try {
    const stat = await fs.stat(workspaceRoot);
    if (!stat.isDirectory()) return { name: "Workspace", ok: false, detail: `"${workspaceRoot}" exists but is not a directory.`, critical: true };
  } catch {
    return { name: "Workspace", ok: false, detail: `"${workspaceRoot}" does not exist.`, critical: true };
  }
  return { name: "Workspace", ok: true, detail: workspaceRoot, critical: true };
}

async function checkWritePermission(workspaceRoot: string): Promise<DiagnosticResult> {
  const probe = path.join(workspaceRoot, `.founder-os-doctor-${Date.now()}`);
  try {
    await fs.writeFile(probe, "ok", "utf-8");
    await fs.unlink(probe);
    return { name: "Write permission", ok: true, detail: "workspace is writable", critical: true };
  } catch (error) {
    return { name: "Write permission", ok: false, detail: error instanceof Error ? error.message : "cannot write to workspace", critical: true };
  }
}

async function checkRequiredPaths(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];
  for (const [label, target] of [
    ["Agent directory (.claude/agents)", PATHS.agentsOutputDir],
    ["Registry file", PATHS.registryFile],
  ] as const) {
    try {
      await fs.access(target);
      results.push({ name: label, ok: true, detail: target, critical: false });
    } catch {
      results.push({ name: label, ok: false, detail: `not found at ${target}`, critical: false });
    }
  }
  return results;
}

function checkEnvironment(): DiagnosticResult {
  const relevant = ["OLLAMA_HOST", "FOUNDER_WORKSPACE", "FOUNDER_DEFAULT_MODEL", "AGENT_FACTORY_LOG_LEVEL", "AGENT_FACTORY_LOG_FORMAT"];
  const set = relevant.filter((key) => Boolean(process.env[key]));
  return {
    name: "Environment variables",
    ok: true,
    detail: set.length > 0 ? `set: ${set.join(", ")}` : "none set (using defaults)",
    critical: false,
  };
}

export const doctorCommand = new Command("doctor")
  .description("Run startup diagnostics: Ollama reachability, configured model, workspace, permissions, config validity")
  .option("--json", "Machine-readable JSON output")
  .action(async (opts: { json?: boolean }) => {
    const { config, issues, ok: configOk } = loadFounderConfig();
    const results: DiagnosticResult[] = [];

    results.push({
      name: "Configuration",
      ok: configOk,
      detail: configOk ? "all values valid" : issues.map((i) => `${i.path}: ${i.message}`).join("; "),
      critical: false,
    });

    results.push(await checkWorkspace(config.workspaceRoot));
    results.push(await checkWritePermission(config.workspaceRoot));
    results.push(...(await checkRequiredPaths()));
    results.push(checkEnvironment());

    const runtime = composeFounderRuntime(config);
    const ollamaReachable = await runtime.llm.isAvailable("ollama").catch(() => false);
    results.push({
      name: "Ollama daemon",
      ok: ollamaReachable,
      detail: ollamaReachable ? `reachable at ${config.ollamaHost}` : `unreachable at ${config.ollamaHost} — run 'ollama serve'`,
      critical: false,
    });

    const provider = runtime.llm.getProvider("ollama");
    if (ollamaReachable && provider instanceof OllamaProvider) {
      const models = await provider.listModels();
      const hasDefault = models.includes(config.defaultModel);
      results.push({
        name: "Configured model",
        ok: hasDefault,
        detail: hasDefault
          ? `"${config.defaultModel}" is installed`
          : `"${config.defaultModel}" not found locally (installed: ${models.join(", ") || "none"}) — run 'ollama pull ${config.defaultModel}'`,
        critical: false,
      });
    }

    if (opts.json) {
      stdout(JSON.stringify({ ok: results.every((r) => r.ok || !r.critical), results }, null, 2));
    } else {
      stdout("Founder OS — startup diagnostics\n");
      for (const result of results) {
        const badge = result.ok ? "✓" : result.critical ? "✗" : "!";
        stdout(`  [${badge}] ${result.name}: ${result.detail}`);
      }
    }

    const criticalFailure = results.some((r) => r.critical && !r.ok);
    if (criticalFailure) process.exitCode = 1;
  });
