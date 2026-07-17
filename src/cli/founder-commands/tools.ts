import { Command } from "commander";
import { loadFounderConfig } from "../../settings/founder-config.js";
import { composeFounderRuntime } from "../founder-runtime.js";
import { stdout } from "../output.js";

export const toolsCommand = new Command("tools").description("Inspect the built-in Tool Registry");

toolsCommand
  .command("list")
  .description("List every registered tool with its permission mode and capabilities")
  .option("--capability <capability>", "Filter by capability tag (e.g. read, write, execute, shell, git, http, search)")
  .option("--json", "Machine-readable JSON output")
  .action(async (opts: { capability?: string; json?: boolean }) => {
    const { config } = loadFounderConfig();
    const runtime = composeFounderRuntime(config);
    const descriptors = runtime.toolExecutor.toolRegistry.describe(opts.capability ? { capability: opts.capability } : {});

    if (opts.json) {
      stdout(JSON.stringify(descriptors, null, 2));
      return;
    }
    for (const tool of descriptors) {
      stdout(`${tool.id.padEnd(20)} [${tool.permission.mode.padEnd(13)}] ${tool.description}`);
    }
  });
