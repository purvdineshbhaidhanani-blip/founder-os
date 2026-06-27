import path from "node:path";
import { Command } from "commander";
import { PATHS } from "../../constants/paths.js";
import { loadRegistry } from "../../registry/registryStore.js";
import { findByName, listAgents } from "../../registry/registryManager.js";
import { failWithMessage, stdout } from "../output.js";

export const registryCommand = new Command("registry").description("Inspect the agent registry");

registryCommand
  .command("list")
  .description("List every registered agent")
  .option("--category <category>", "Filter by category")
  .option("--status <status>", "Filter by status")
  .option("--owner <owner>", "Filter by owner")
  .option("--tag <tag>", "Filter by tag")
  .option("--registry-file <file>", "Registry file path", PATHS.registryFile)
  .action(async (opts: { category?: string; status?: string; owner?: string; tag?: string; registryFile: string }) => {
    const registry = await loadRegistry(opts.registryFile);
    const filtered = listAgents(registry, {
      category: opts.category,
      status: opts.status as never,
      owner: opts.owner,
      tag: opts.tag,
    });
    if (filtered.length === 0) {
      stdout("(no agents registered)");
      return;
    }
    for (const agent of filtered) {
      stdout(
        `${agent.name.padEnd(36)} ${agent.category.padEnd(14)} ${agent.status.padEnd(11)} v${agent.version}  ${path.relative(PATHS.root, agent.filePath)}`,
      );
    }
  });

registryCommand
  .command("show")
  .description("Show one registered agent in full")
  .argument("<name>", "The agent name (kebab-case)")
  .option("--registry-file <file>", "Registry file path", PATHS.registryFile)
  .action(async (name: string, opts: { registryFile: string }) => {
    const registry = await loadRegistry(opts.registryFile);
    const entry = findByName(registry, name);
    if (!entry) {
      failWithMessage(`No registry entry named "${name}".`);
    }
    stdout(JSON.stringify(entry, null, 2));
  });
