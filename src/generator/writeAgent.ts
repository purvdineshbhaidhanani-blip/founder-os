import type { GeneratedAgentFile } from "../types/agent.js";
import type { ValidationReport } from "../types/validation.js";
import { err, ok, type Result } from "../utils/result.js";
import { pathExists, writeTextFile } from "../utils/fs.js";

export interface WriteAgentOptions {
  overwrite?: boolean;
}

/**
 * Persists a GeneratedAgentFile to disk. Intentionally dumb — it does not
 * validate. Callers should run the Agent Validator (src/validator) against
 * `file` *before* calling this, so an invalid agent is never written into
 * `.claude/agents/` in the first place.
 */
export async function writeGeneratedAgent(
  file: GeneratedAgentFile,
  options: WriteAgentOptions = {},
): Promise<Result<string, ValidationReport>> {
  if (!options.overwrite && (await pathExists(file.filePath))) {
    return err({
      valid: false,
      issues: [
        {
          code: "AGENT_FILE_ALREADY_EXISTS",
          severity: "error",
          message: `"${file.filePath}" already exists. Pass overwrite:true to replace it.`,
        },
      ],
    });
  }

  await writeTextFile(file.filePath, file.raw);
  return ok(file.filePath);
}
