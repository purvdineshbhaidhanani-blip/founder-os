# Founder OS Runtime Configuration

`src/settings/founder-config.ts` — the typed, validated, env-sourced config
the `founder` CLI reads. Distinct from `SettingsManager`
(`src/settings/manager.ts`, the generic company-OS key/value + provider/
limits bag used by the Command Center/Cost Optimizer): this module answers
one narrow question — "what does the founder runtime CLI need to run agents
and tools locally" — with a real zod schema, safe defaults, and never a
crash on a malformed value.

## Variables

| Env var | Default | Meaning |
|---|---|---|
| `FOUNDER_WORKSPACE` | repo root | Sandbox root every file/shell/git tool call is contained to. |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Local Ollama daemon base URL. |
| `FOUNDER_DEFAULT_MODEL` | `llama3.1` | Local model id used when nothing more specific is given. |
| `FOUNDER_MODEL_ALIASES` | `{}` | JSON object mapping a Claude-era frontmatter model hint (`opus`/`sonnet`/`haiku`) to a real local model id. |
| `AGENT_FACTORY_LOG_LEVEL` | `info` | `debug`\|`info`\|`warn`\|`error`\|`silent` (shared with the existing logger). |
| `AGENT_FACTORY_LOG_FORMAT` | `text` | `text`\|`json` (shared with the existing logger). |
| `FOUNDER_MAX_TOOL_TURNS` | `5` | Cap on the tool-call back-and-forth per agent execution. |
| `FOUNDER_APPROVAL_TIMEOUT_SECONDS` | `300` | How long an "ask-user" tool approval waits before being treated as denied. |

## Validation behavior

`loadFounderConfig()` **never throws**. A malformed value (bad URL, invalid
JSON, non-numeric string) is:
1. Reported in `issues` (`{ path, message }`), and
2. Replaced with its default — the OTHER, validly-set fields are never
   discarded because one field was wrong (verified in
   `tests/settings/founder-config.test.ts`).

`founder doctor` and `founder config` both surface `issues` so a bad env var
is loud and actionable, never a silent fallback nobody notices.

## Model alias resolution (Loop 4 item 2 — provider-independent mapping)

`resolveAliasedModel(config, frontmatterModelHint)` maps an agent's
frontmatter `model:` hint through `FOUNDER_MODEL_ALIASES`, falling back to
`defaultModel` when there's no alias. This is applied **only in the CLI**
(`founder-commands/agent.ts`), never inside
`src/runtime/agents/executor.ts#resolveModel` — that function is
deliberately unchanged from Loop 2 and still never performs this mapping
itself (documented there: inventing a Claude→local mapping inside the
execution engine would be a fabricated decision). Keeping the alias at the
CLI/config layer means it's fully swappable via one env var, with zero
changes to the execution engine.

Example:
```
export FOUNDER_MODEL_ALIASES='{"opus":"llama3.1:70b","sonnet":"llama3.1","haiku":"llama3.2"}'
founder run market-research-agent "..."   # market-research-agent's frontmatter says model: opus -> resolves to llama3.1:70b
```

## Startup diagnostics

`founder doctor` checks, in order: configuration validity, workspace
existence, workspace write permission, required directories
(`.claude/agents`, `registry/agents.registry.json`), which env vars are set,
Ollama daemon reachability, and (if reachable) whether the configured
default model is actually installed. See `docs/CLI_GUIDE.md`.
