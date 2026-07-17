# `founder` CLI Guide

The production runtime CLI (Loop 4). Distinct from `agent-factory`
(`src/cli/index.ts`, which designs/generates/validates/registers agent
*definition* files) — `founder` *runs* the agents and tools that already
exist under `.claude/agents/*.md`, against the real Runtime built in Loops
1–3. Every command is a thin wrapper over `AgentLoader`/`AgentExecutor`/
`ToolExecutor` — there is no second execution engine.

## Install

```
npm ci && npm run build
node dist/cli/founder.js --help
# or during development:
npx tsx src/cli/founder.ts --help
```

## Commands

### `founder doctor`
Startup diagnostics: configuration validity, workspace existence/writability,
required directories (`.claude/agents`, `registry/agents.registry.json`),
environment variables set, Ollama daemon reachability, and whether the
configured default model is installed. `--json` for machine-readable output.
Exits non-zero only on a **critical** failure (workspace missing/unwritable);
Ollama being unreachable is reported but not fatal — you can still inspect
config/tools/agents without a daemon running.

```
founder doctor
founder doctor --json
```

### `founder run <agentId> "<task>"`
Shorthand for `founder agent execute` — the everyday entrypoint.

```
founder run market-research-agent "Find me a SaaS idea for dentists."
founder run report-generator "Summarize the last run" --tools
founder run market-research-agent "..." --model llama3.1:70b --no-interactive
```

Options:
- `--model <model>` — explicit local model id, overriding config alias resolution.
- `--tools` — allow the agent to call File/Shell/Git/HTTP/Search tools.
- `--max-tool-turns <n>` — cap on the tool-call back-and-forth (default from config, 5).
- `--no-interactive` — never prompt on stdin for "ask-user" tool approval (such calls are denied, not blocked forever).

### `founder agent list` / `founder agent execute <agentId> "<task>"`
`list` prints every agent discovered under `.claude/agents/*.md`. `execute`
is the same command `run` aliases (identical options).

### `founder tools list`
Lists every built-in tool (file/shell/git/http/search) with its permission
mode and description. `--capability <tag>` filters (`read`, `write`,
`execute`, `delete`, `network-write`, `shell`, `git`, `http`, `search`).
`--json` for the full `ToolDescriptor` (including JSON-Schema input shape).

### `founder models`
Prints the configured default model + any configured aliases, and (when
Ollama is reachable) every locally installed model.

### `founder config`
Prints the fully resolved, validated configuration (env → typed config,
safe defaults applied) and any validation issues. `--json` for scripting.

### `founder version`
Prints the Founder OS version.

## Tool approval in the CLI

Mutating tools (`write_file`, `run_bash`, `git_commit`, `http_post`, etc.)
default to `"ask-user"`. By default, `founder run`/`founder agent execute`
wire a REAL interactive `[y/N]` stdin prompt (via the existing
`ApprovalSystem`) — you'll be asked before anything mutates. Pass
`--no-interactive` to run non-interactively; ask-user calls are then denied
(never silently allowed), and the agent's final response reflects that in
its `toolCalls` record.

## Exit codes
`0` on success. `1` on any command failure (unknown agent, LLM/tool error,
critical doctor failure) — always with a human-readable message on stderr,
never a raw stack trace or a silent failure.
