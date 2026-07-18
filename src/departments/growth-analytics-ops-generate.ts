import { reportToString } from "../types/validation.js";
import { validateBlueprint } from "../blueprint/validate.js";
import { saveBlueprint } from "../blueprint/builder.js";
import { generateAgentFile } from "../generator/generateAgent.js";
import { writeGeneratedAgent } from "../generator/writeAgent.js";
import { validateGeneratedAgent } from "../validator/runValidation.js";
import { registerAgent } from "../registry/registerAgent.js";
import { buildDepartmentBlueprint } from "./blueprint.js";
import { GROWTH_ANALYTICS_OPS_DEPARTMENT } from "./growth-analytics-ops.js";

const GROWTH_ANALYTICS_OPS_OWNER = "growth-analytics-ops-department";

/**
 * Runs the full Agent Factory pipeline for every Growth, Analytics &
 * Operations Department spec:
 *
 *   blueprint -> validate -> save -> generate -> validate agent -> write -> register
 *
 * Same path the CLI `generate` command uses, batched. Nothing is written for
 * an agent whose blueprint or rendered file fails validation; warnings (e.g.
 * not-yet-generated collaborators) do not block.
 */
async function main(): Promise<void> {
  let ok = 0;
  let failed = 0;
  let warned = 0;

  process.stdout.write("Growth, Analytics & Operations Department\n\n");

  for (const spec of GROWTH_ANALYTICS_OPS_DEPARTMENT) {
    const blueprint = buildDepartmentBlueprint(spec, GROWTH_ANALYTICS_OPS_OWNER);

    const blueprintCheck = validateBlueprint(blueprint);
    if (!blueprintCheck.ok) {
      failed += 1;
      process.stdout.write(`FAIL  ${spec.name} (blueprint)\n${reportToString(blueprintCheck.errors)}\n`);
      continue;
    }

    await saveBlueprint(blueprint, { overwrite: true });

    const file = generateAgentFile(blueprint);
    const report = await validateGeneratedAgent(file);
    if (!report.valid) {
      failed += 1;
      process.stdout.write(`FAIL  ${spec.name} (agent)\n${reportToString(report)}\n`);
      continue;
    }

    const written = await writeGeneratedAgent(file, { overwrite: true });
    if (!written.ok) {
      failed += 1;
      process.stdout.write(`FAIL  ${spec.name} (write)\n${reportToString(written.errors)}\n`);
      continue;
    }

    await registerAgent({ blueprint, filePath: written.value });

    const warnings = report.issues.length;
    if (warnings > 0) warned += 1;
    ok += 1;
    process.stdout.write(
      `OK    ${spec.name.padEnd(32)} [${spec.category}]${warnings > 0 ? `  (${warnings} warning${warnings === 1 ? "" : "s"})` : ""}\n`,
    );
  }

  process.stdout.write(
    `\nGenerated ${ok}/${GROWTH_ANALYTICS_OPS_DEPARTMENT.length} agents (${warned} with warnings, ${failed} failed).\n`,
  );

  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${(error as Error).stack ?? (error as Error).message}\n`);
  process.exitCode = 1;
});
