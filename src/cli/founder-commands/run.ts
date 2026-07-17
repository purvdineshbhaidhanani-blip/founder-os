import { Command } from "commander";
import { executeAgentAction } from "./agent.js";

/**
 * `founder run` — a top-level shorthand for `founder agent execute`, exactly
 * as named in the mission spec. Reuses the SAME action function (no second
 * execution path); this command exists purely for the shorter, friendlier
 * invocation `founder run <agentId> "<task>"`.
 */
export const runCommand = new Command("run")
  .description("Shorthand for 'agent execute': run one agent against a task")
  .argument("<agentId>", "The agent's frontmatter name (e.g. market-research-agent)")
  .argument("<task>", "The task/question to give the agent")
  .option("--model <model>", "Explicit local model id (overrides config alias resolution)")
  .option("--tools", "Allow the agent to call tools (file/shell/git/http/search)", false)
  .option("--max-tool-turns <n>", "Cap on the tool-call back-and-forth")
  .option("--no-interactive", "Never prompt on stdin for tool approval (ask-user tool calls are denied)")
  .action(executeAgentAction);
