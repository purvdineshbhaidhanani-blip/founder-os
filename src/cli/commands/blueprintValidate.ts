import path from "node:path";
import { Command } from "commander";
import { PATHS } from "../../constants/paths.js";
import { loadBlueprintFromFile } from "../../blueprint/loader.js";
import { failWith, stdout } from "../output.js";

export const blueprintValidateCommand = new Command("validate")
  .description("Validate a blueprint JSON file against the schema and semantic rules")
  .argument("<file>", "Path to the blueprint JSON file")
  .action(async (file: string) => {
    const result = await loadBlueprintFromFile(file);
    if (!result.ok) {
      failWith(result.errors);
    }
    stdout(`OK ${path.relative(PATHS.root, file)} (${result.value.identity.name} v${result.value.version})`);
  });
