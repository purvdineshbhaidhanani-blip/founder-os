#!/usr/bin/env node
import { Command } from "commander";
import { FACTORY_VERSION } from "../constants/factory.js";
import { CliExit, stderr } from "./output.js";
import { doctorCommand } from "./founder-commands/doctor.js";
import { runCommand } from "./founder-commands/run.js";
import { agentCommand } from "./founder-commands/agent.js";
import { toolsCommand } from "./founder-commands/tools.js";
import { modelsCommand } from "./founder-commands/models.js";
import { configCommand } from "./founder-commands/config.js";
import { versionCommand } from "./founder-commands/version.js";

/**
 * `founder` — the production runtime CLI (Loop 4). Distinct from
 * `agent-factory` (`src/cli/index.ts`, which designs/generates/validates/
 * registers agent DEFINITION files): this CLI RUNS the agents/tools that
 * already exist under `.claude/agents/*.md`, against the real Runtime built
 * in Loops 1-3. Every command is a thin wrapper calling into
 * `AgentLoader`/`AgentExecutor`/`ToolExecutor` — no second execution engine.
 */
export function buildFounderCli(): Command {
  const program = new Command();
  program
    .name("founder")
    .description("Founder OS runtime CLI — run agents and tools locally, without Claude Code.")
    .version(FACTORY_VERSION);

  program.addCommand(doctorCommand);
  program.addCommand(runCommand);
  program.addCommand(agentCommand);
  program.addCommand(toolsCommand);
  program.addCommand(modelsCommand);
  program.addCommand(configCommand);
  program.addCommand(versionCommand);

  return program;
}

export async function runFounderCli(argv: string[]): Promise<void> {
  const program = buildFounderCli();
  try {
    await program.parseAsync(argv);
  } catch (error) {
    if (error instanceof CliExit) return;
    stderr((error as Error).message);
    process.exitCode = 1;
  }
}

const isDirectInvocation = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isDirectInvocation || process.argv[1]?.endsWith("cli/founder.ts") || process.argv[1]?.endsWith("cli/founder.js")) {
  await runFounderCli(process.argv);
}
