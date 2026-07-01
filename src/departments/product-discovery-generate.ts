import { reportToString } from "../types/validation.js";
import { validateBlueprint } from "../blueprint/validate.js";
import { saveBlueprint } from "../blueprint/builder.js";
import { generateAgentFile } from "../generator/generateAgent.js";
import { writeGeneratedAgent } from "../generator/writeAgent.js";
import { validateGeneratedAgent } from "../validator/runValidation.js";
import { registerAgent } from "../registry/registerAgent.js";
import { buildDepartmentBlueprint } from "./blueprint.js";
import { PRODUCT_DISCOVERY_DEPARTMENT } from "./product-discovery.js";
import { scaffoldProductDiscoveryDepartment } from "./product-discovery-scaffold.js";

async function main(): Promise<void> {
  let ok = 0;
  let failed = 0;
  let warned = 0;

  process.stdout.write("Loop 2 — Product Discovery Department\n\n");

  for (const spec of PRODUCT_DISCOVERY_DEPARTMENT) {
    const blueprint = buildDepartmentBlueprint(spec);

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
    `\nGenerated ${ok}/${PRODUCT_DISCOVERY_DEPARTMENT.length} agents (${warned} with warnings, ${failed} failed).\n`,
  );

  if (failed === 0) {
    process.stdout.write("\nScaffolding per-agent folders...\n");
    const scaffolded = await scaffoldProductDiscoveryDepartment(PRODUCT_DISCOVERY_DEPARTMENT);
    for (const entry of scaffolded) {
      process.stdout.write(`  ${entry.path}/\n`);
    }
    process.stdout.write(`\nScaffolded ${scaffolded.length} agent folders.\n`);
  }

  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${(error as Error).stack ?? (error as Error).message}\n`);
  process.exitCode = 1;
});
