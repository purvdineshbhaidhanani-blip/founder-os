import path from "node:path";
import { Command } from "commander";
import { PATHS } from "../../constants/paths.js";
import { loadAllBlueprints } from "../../blueprint/loader.js";
import { stdout } from "../output.js";

export const blueprintListCommand = new Command("list")
  .description("List every discovered blueprint and its validation status")
  .option("--dir <dir>", "Directory to scan", PATHS.blueprintsDir)
  .action(async (opts: { dir: string }) => {
    const entries = await loadAllBlueprints(opts.dir);
    if (entries.length === 0) {
      stdout("(no blueprints found)");
      return;
    }
    for (const entry of entries) {
      const relativePath = path.relative(PATHS.root, entry.filePath);
      if (entry.result.ok) {
        const bp = entry.result.value;
        stdout(`OK    ${relativePath}  →  ${bp.identity.name}@${bp.version} [${bp.identity.category}]`);
      } else {
        const firstIssue = entry.result.errors.issues[0];
        stdout(`FAIL  ${relativePath}  ${firstIssue ? `(${firstIssue.code}: ${firstIssue.message})` : ""}`);
      }
    }
  });
