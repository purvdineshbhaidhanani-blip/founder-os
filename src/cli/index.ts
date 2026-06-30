#!/usr/bin/env node
import { Command } from "commander";
import { FACTORY_NAME, FACTORY_VERSION } from "../constants/factory.js";
import { CliExit, stderr } from "./output.js";
import { blueprintNewCommand } from "./commands/blueprintNew.js";
import { blueprintValidateCommand } from "./commands/blueprintValidate.js";
import { blueprintListCommand } from "./commands/blueprintList.js";
import { generateCommand } from "./commands/generate.js";
import { validateCommand } from "./commands/validate.js";
import { registryCommand } from "./commands/registry.js";
import { templateCommand } from "./commands/template.js";
import { researchCommand } from "./commands/research.js";

export function buildCli(): Command {
  const program = new Command();
  program
    .name("agent-factory")
    .description(`${FACTORY_NAME} CLI — design, generate, validate, and register Claude Code agents.`)
    .version(FACTORY_VERSION);

  const blueprint = new Command("blueprint").description("Blueprint authoring and validation");
  blueprint.addCommand(blueprintNewCommand);
  blueprint.addCommand(blueprintValidateCommand);
  blueprint.addCommand(blueprintListCommand);

  program.addCommand(blueprint);
  program.addCommand(generateCommand);
  program.addCommand(validateCommand);
  program.addCommand(registryCommand);
  program.addCommand(templateCommand);
  program.addCommand(researchCommand);

  return program;
}

export async function runCli(argv: string[]): Promise<void> {
  const program = buildCli();
  try {
    await program.parseAsync(argv);
  } catch (error) {
    if (error instanceof CliExit) return;
    stderr((error as Error).message);
    process.exitCode = 1;
  }
}

const isDirectInvocation = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isDirectInvocation || process.argv[1]?.endsWith("cli/index.ts") || process.argv[1]?.endsWith("cli/index.js")) {
  await runCli(process.argv);
}
