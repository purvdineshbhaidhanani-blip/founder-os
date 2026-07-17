import { Command } from "commander";
import { loadFounderConfig, resolveAliasedModel } from "../../settings/founder-config.js";
import { composeFounderRuntime } from "../founder-runtime.js";
import { stdout, failWithMessage } from "../output.js";

export const agentCommand = new Command("agent").description("Discover and execute Founder OS agents (.claude/agents/*.md)");

agentCommand
  .command("list")
  .description("List every executable agent discovered under .claude/agents/")
  .action(async () => {
    const { config } = loadFounderConfig();
    const runtime = composeFounderRuntime(config);
    const ids = await runtime.agentExecutor.listExecutableAgents();
    if (ids.length === 0) {
      stdout("(no agents found under .claude/agents/)");
      return;
    }
    for (const id of ids.sort()) stdout(id);
  });

export async function executeAgentAction(
  agentId: string,
  task: string,
  opts: { model?: string; tools?: boolean; maxToolTurns?: string; interactive?: boolean },
): Promise<void> {
  const { config } = loadFounderConfig();
  const runtime = composeFounderRuntime(config, { interactiveApprovals: opts.interactive ?? true });

  let agent;
  try {
    agent = await runtime.agentLoader.loadByName(agentId);
  } catch (error) {
    failWithMessage(error instanceof Error ? error.message : `Unknown agent "${agentId}".`);
  }

  const model = opts.model ?? resolveAliasedModel(config, agent.frontmatter.model);
  const maxToolTurns = opts.maxToolTurns ? Number.parseInt(opts.maxToolTurns, 10) : config.maxToolTurns;

  const result = await runtime.agentExecutor.executeAgent(
    agentId,
    task,
    {},
    {
      model,
      ...(opts.tools ? { tools: runtime.toolExecutor, toolWorkingDirectory: config.workspaceRoot, maxToolTurns } : {}),
    },
  );

  if (!result.success) {
    failWithMessage(`Agent execution failed [${result.error.reason}]: ${result.error.message}`);
  }

  stdout(`\n${result.response}\n`);
  if (result.toolCalls.length > 0) {
    stdout(`Tool calls: ${result.toolCalls.map((c) => `${c.name}(${c.status})`).join(", ")}`);
  }
  stdout(`Model: ${result.metadata.modelUsed} (${result.metadata.modelSource}) — ${result.metadata.durationMs}ms`);
}

agentCommand
  .command("execute")
  .description("Execute one agent against a task")
  .argument("<agentId>", "The agent's frontmatter name (e.g. market-research-agent)")
  .argument("<task>", "The task/question to give the agent")
  .option("--model <model>", "Explicit local model id (overrides config alias resolution)")
  .option("--tools", "Allow the agent to call tools (file/shell/git/http/search)", false)
  .option("--max-tool-turns <n>", "Cap on the tool-call back-and-forth")
  .option("--no-interactive", "Never prompt on stdin for tool approval (ask-user tool calls are denied)")
  .action(executeAgentAction);
