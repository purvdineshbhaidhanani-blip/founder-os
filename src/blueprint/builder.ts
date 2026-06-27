import type { AgentBlueprint, BlueprintScaffoldInput, BlueprintTemplate } from "../types/blueprint.js";
import type { ValidationReport } from "../types/validation.js";
import { err, ok, type Result } from "../utils/result.js";
import { isValidSlug } from "../utils/slug.js";
import { writeJsonFile, pathExists } from "../utils/fs.js";
import { blueprintFilePath } from "./loader.js";
import { validateBlueprint } from "./validate.js";

/**
 * Scaffolds a new, schema-valid blueprint from a template plus minimal
 * identity input. The result is re-validated end-to-end (shape + semantics)
 * before being returned, so a template can never hand back something the
 * rest of the pipeline would reject — if it did, that's a bug in the
 * template, surfaced immediately instead of downstream at generation time.
 */
export function scaffoldBlueprint(
  template: BlueprintTemplate,
  input: BlueprintScaffoldInput,
): Result<AgentBlueprint, ValidationReport> {
  if (!isValidSlug(input.name)) {
    return err({
      valid: false,
      issues: [
        {
          code: "INVALID_SLUG",
          severity: "error",
          message: `"${input.name}" is not a valid kebab-case slug (e.g. "code-reviewer").`,
          path: "identity.name",
        },
      ],
    });
  }

  const candidate = template.build(input);
  return validateBlueprint(candidate);
}

export interface SaveBlueprintOptions {
  destDir?: string;
  overwrite?: boolean;
}

/** Persists a validated blueprint to `blueprints/<name>.blueprint.json`. */
export async function saveBlueprint(
  blueprint: AgentBlueprint,
  options: SaveBlueprintOptions = {},
): Promise<Result<string, ValidationReport>> {
  const filePath = blueprintFilePath(blueprint.identity.name, options.destDir);

  if (!options.overwrite && (await pathExists(filePath))) {
    return err({
      valid: false,
      issues: [
        {
          code: "BLUEPRINT_ALREADY_EXISTS",
          severity: "error",
          message: `"${filePath}" already exists. Pass overwrite:true to replace it.`,
          path: "identity.name",
        },
      ],
    });
  }

  await writeJsonFile(filePath, blueprint);
  return ok(filePath);
}
