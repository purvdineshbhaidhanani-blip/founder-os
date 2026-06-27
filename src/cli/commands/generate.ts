import path from "node:path";
import { Command } from "commander";
import { PATHS } from "../../constants/paths.js";
import { loadBlueprintFromFile } from "../../blueprint/loader.js";
import { generateAgentFile } from "../../generator/generateAgent.js";
import { writeGeneratedAgent } from "../../generator/writeAgent.js";
import { validateGeneratedAgent } from "../../validator/runValidation.js";
import { registerAgent } from "../../registry/registerAgent.js";
import { failWith, printReport, stdout } from "../output.js";

interface GenerateOptions {
  outputDir?: string;
  overwrite?: boolean;
  skipRegister?: boolean;
  registryFile?: string;
  ignoreReferenceErrors?: boolean;
}

export const generateCommand = new Command("generate")
  .description("Generate, validate, write, and register a Claude Code agent from a blueprint")
  .argument("<blueprint>", "Path to the blueprint JSON file")
  .option("--output-dir <dir>", ".claude/agents output directory", PATHS.agentsOutputDir)
  .option("--overwrite", "Overwrite an existing agent file with the same name", false)
  .option("--skip-register", "Skip the registry upsert (useful for dry-runs)", false)
  .option("--registry-file <file>", "Registry file path", PATHS.registryFile)
  .action(async (blueprintPath: string, opts: GenerateOptions) => {
    const loaded = await loadBlueprintFromFile(blueprintPath);
    if (!loaded.ok) {
      failWith(loaded.errors);
    }

    const blueprint = loaded.value;
    const file = generateAgentFile(blueprint, { outputDir: opts.outputDir });

    const report = await validateGeneratedAgent(file, { agentsDir: opts.outputDir });
    if (!report.valid) {
      failWith(report);
    }
    if (report.issues.length > 0) {
      printReport(report);
    }

    const written = await writeGeneratedAgent(file, { overwrite: opts.overwrite });
    if (!written.ok) {
      failWith(written.errors);
    }
    stdout(`Wrote ${path.relative(PATHS.root, written.value)}`);

    if (opts.skipRegister) return;

    const upsert = await registerAgent(
      { blueprint, filePath: written.value },
      opts.registryFile,
    );
    stdout(
      upsert.changed
        ? `Registered ${blueprint.identity.name} (id=${upsert.entry.id}, hash=${upsert.entry.blueprintHash})`
        : `Registry unchanged for ${blueprint.identity.name} (already up to date)`,
    );
  });
