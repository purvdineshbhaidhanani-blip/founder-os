import path from "node:path";
import type { AgentBlueprint } from "../types/blueprint.js";
import type { ValidationReport } from "../types/validation.js";
import { err, type Result } from "../utils/result.js";
import { listFilesWithExtension, readJsonFile } from "../utils/fs.js";
import { PATHS } from "../constants/paths.js";
import { validateBlueprint } from "./validate.js";

export const BLUEPRINT_FILE_EXTENSION = ".blueprint.json";

export function blueprintFilePath(name: string, dir: string = PATHS.blueprintsDir): string {
  return path.join(dir, `${name}${BLUEPRINT_FILE_EXTENSION}`);
}

/** Loads and fully validates (shape + semantics) a blueprint from a JSON file on disk. */
export async function loadBlueprintFromFile(
  filePath: string,
): Promise<Result<AgentBlueprint, ValidationReport>> {
  let raw: unknown;
  try {
    raw = await readJsonFile<unknown>(filePath);
  } catch (error) {
    return err({
      valid: false,
      issues: [
        {
          code: "BLUEPRINT_READ_FAILED",
          severity: "error",
          message: `Could not read/parse "${filePath}" as JSON: ${(error as Error).message}`,
        },
      ],
    });
  }
  return validateBlueprint(raw);
}

/** Discovers every `*.blueprint.json` file directly under `dir` (default: blueprints/). */
export async function discoverBlueprintFiles(dir: string = PATHS.blueprintsDir): Promise<string[]> {
  const direct = await listFilesWithExtension(dir, BLUEPRINT_FILE_EXTENSION);
  const examples = await listFilesWithExtension(PATHS.blueprintExamplesDir, BLUEPRINT_FILE_EXTENSION);
  return dir === PATHS.blueprintsDir ? [...direct, ...examples] : direct;
}

/** Loads and validates every blueprint file discovered under `dir`. Never throws per-file. */
export async function loadAllBlueprints(
  dir: string = PATHS.blueprintsDir,
): Promise<Array<{ filePath: string; result: Result<AgentBlueprint, ValidationReport> }>> {
  const files = await discoverBlueprintFiles(dir);
  const results = await Promise.all(
    files.map(async (filePath) => ({ filePath, result: await loadBlueprintFromFile(filePath) })),
  );
  return results;
}
