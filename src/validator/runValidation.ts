import type { GeneratedAgentFile } from "../types/agent.js";
import type { ValidationReport } from "../types/validation.js";
import { loadValidatorContext, type LoadValidatorContextOptions } from "./context.js";
import { validateAgent } from "./validateAgent.js";

/**
 * Convenience entrypoint for the CLI: loads the on-disk validator context
 * (every other agent currently registered) and validates `candidate` against
 * it. Automatically excludes an existing agent with the same name from the
 * duplicate-checks, since regenerating agent X should compare X against
 * everyone *else*, not its own previous version.
 */
export async function validateGeneratedAgent(
  candidate: GeneratedAgentFile,
  options: LoadValidatorContextOptions = {},
): Promise<ValidationReport> {
  const context = await loadValidatorContext({
    ...options,
    excludeName: options.excludeName ?? candidate.frontmatter.name,
  });
  return validateAgent(candidate, context);
}
