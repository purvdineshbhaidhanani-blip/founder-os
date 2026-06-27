# Usage

This document is the day-to-day reference for using the Agent Factory.
For the design rationale, see [ARCHITECTURE.md](./ARCHITECTURE.md).
For the rules a generated agent must satisfy, see [VALIDATION_PROCESS.md](./VALIDATION_PROCESS.md).

## Install

```bash
npm install
npm run build
```

`npm run build` compiles TypeScript into `dist/`. The CLI is exposed as
`agent-factory` via the `bin` entry in `package.json`. During development
you can use `npm run factory -- <command>` to run the CLI directly via
`tsx` without rebuilding.

## CLI overview

All commands are subcommands of `agent-factory`:

| Command                        | Purpose                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| `blueprint new <category>`     | Scaffold a blueprint JSON from a category template                 |
| `blueprint validate <file>`    | Validate a blueprint JSON against the schema and semantic rules    |
| `generate <blueprint>`         | Generate a Claude Code agent Markdown file from a blueprint        |
| `validate <agent.md>`          | Validate a generated agent file                                    |
| `registry list`                | List every registered agent                                        |
| `registry show <name>`         | Show one registered agent in full                                  |

> Flags shown in the examples below are the canonical names; run
> `agent-factory <command> --help` for the authoritative list.

## Scaffolding a blueprint

```bash
agent-factory blueprint new engineering \
  --name backend-api-implementer \
  --display-name "Backend API Implementer" \
  --owner platform-team \
  --tags backend,api
```

This writes `blueprints/backend-api-implementer.blueprint.json` populated
from the engineering category template. Open the file and refine the
fields the template can't know (specific responsibilities, real
documentation links, etc.).

## Validating a blueprint

```bash
agent-factory blueprint validate blueprints/backend-api-implementer.blueprint.json
```

Returns an exit code of `0` if the blueprint passes both the Zod schema
and every semantic rule (see
[VALIDATION_PROCESS.md](./VALIDATION_PROCESS.md)), or `1` with a printed
report otherwise.

## Generating an agent

```bash
agent-factory generate blueprints/backend-api-implementer.blueprint.json
```

Generation runs blueprint validation, agent validation, and registry
update as a single transaction:

1. Load and validate the blueprint.
2. Render the agent Markdown in memory.
3. Validate the rendered agent against every agent rule.
4. Only on success: write to `.claude/agents/<name>.md` and update
   `registry/agents.registry.json`.

If validation fails at any step, nothing is written to disk and the CLI
exits non-zero.

## Re-generating

Re-running `generate` on an already-registered blueprint is idempotent:

* If the blueprint hash hasn't changed, the registry entry is left
  untouched.
* If the blueprint hash has changed, the agent file is rewritten and a
  `regenerated` history entry is appended to the registry entry.

## Inspecting the registry

```bash
agent-factory registry list
agent-factory registry show backend-api-implementer
```

The registry is stored as a single JSON file at
`registry/agents.registry.json`. It is safe to read, but should only be
modified via the CLI.

## Where things live

| Path                         | Purpose                                       |
| ---------------------------- | --------------------------------------------- |
| `blueprints/`                | Source-of-truth blueprint JSON files          |
| `blueprints/examples/`       | Reference blueprints used for tests and docs  |
| `.claude/agents/`            | Generated Claude Code subagent files          |
| `registry/agents.registry.json` | Catalog of every registered agent          |
| `docs/`                      | Architecture and process documentation        |
| `src/`                       | Factory source code                           |

See [LIFECYCLE.md](./LIFECYCLE.md) for the state machine an individual
agent moves through over its life.
