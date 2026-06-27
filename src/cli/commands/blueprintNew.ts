import path from "node:path";
import { Command } from "commander";
import { AGENT_CATEGORIES, isAgentCategory } from "../../constants/categories.js";
import { PATHS } from "../../constants/paths.js";
import { saveBlueprint, scaffoldBlueprint } from "../../blueprint/builder.js";
import { getTemplate } from "../../templates/registry.js";
import { failWith, failWithMessage, stdout } from "../output.js";

interface BlueprintNewOptions {
  name: string;
  displayName?: string;
  owner: string;
  summary?: string;
  tags?: string;
  destDir?: string;
  overwrite?: boolean;
}

export const blueprintNewCommand = new Command("new")
  .description("Scaffold a new blueprint JSON from a category template")
  .argument("<category>", `One of: ${AGENT_CATEGORIES.join(", ")}`)
  .requiredOption("--name <name>", "Kebab-case machine name (e.g. backend-api-implementer)")
  .option("--display-name <displayName>", "Human-readable name (defaults to titleized --name)")
  .requiredOption("--owner <owner>", "Team or person accountable for this agent")
  .option("--summary <summary>", "One-line description (10-240 chars)")
  .option("--tags <tags>", "Comma-separated tag list")
  .option("--dest-dir <dir>", "Output directory", PATHS.blueprintsDir)
  .option("--overwrite", "Overwrite if the blueprint file already exists", false)
  .action(async (category: string, opts: BlueprintNewOptions) => {
    if (!isAgentCategory(category)) {
      failWithMessage(`Unknown category "${category}". Expected one of: ${AGENT_CATEGORIES.join(", ")}.`);
    }

    const template = getTemplate(category);
    const tags = opts.tags ? opts.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : undefined;

    const scaffold = scaffoldBlueprint(template, {
      name: opts.name,
      displayName: opts.displayName ?? titleize(opts.name),
      owner: opts.owner,
      summary: opts.summary,
      tags,
    });

    if (!scaffold.ok) {
      failWith(scaffold.errors);
    }

    const saved = await saveBlueprint(scaffold.value, {
      destDir: opts.destDir,
      overwrite: opts.overwrite,
    });

    if (!saved.ok) {
      failWith(saved.errors);
    }

    stdout(`Created ${path.relative(PATHS.root, saved.value)}`);
  });

function titleize(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => `${word[0]!.toUpperCase()}${word.slice(1)}`)
    .join(" ");
}
