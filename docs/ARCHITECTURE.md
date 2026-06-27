# Agent Factory — Architecture

## What this repository is

This repository is **not** an application. It is the internal platform AI
Founder OS uses to design, generate, validate, and register every Claude Code
agent the organization runs. The factory's job is to turn a structured
description of an agent (a **Blueprint**) into a production-ready agent file
in `.claude/agents/`, with a permanent, queryable record of that agent in the
**Registry**.

This repository is fully self-contained. It does not read from, write to, or
depend on any other repository (in particular, never the Creator Decision
Engine). Everything the factory needs lives under this repo root.

## The pipeline

```
Template Library  ──▶  Blueprint  ──▶  Blueprint Engine  ──▶  Agent Generator  ──▶  Agent Validator  ──▶  Agent Registry
 (src/templates)        (JSON file      (src/blueprint)        (src/generator)       (src/validator)       (src/registry)
                         in blueprints/)                              │                                          │
                                                                       ▼                                          ▼
                                                          .claude/agents/<name>.md                 registry/agents.registry.json
```

1. **Template Library** (`src/templates/`) — Reusable starting points (engineering,
   planning, documentation, review, QA, DevOps, research, architecture). A new
   blueprint is scaffolded from a template instead of written from scratch.
2. **Blueprint** (`blueprints/*.blueprint.json`) — A JSON document conforming to
   `AgentBlueprintSchema` (`src/types/blueprint.ts`). This is the single source
   of truth for what an agent is: identity, role, responsibilities, objectives,
   inputs, outputs, workflow, permissions, allowed tools, communication
   protocol, memory access, execution constraints, reporting format, success
   criteria, and failure behavior.
3. **Blueprint Engine** (`src/blueprint/`) — Loads blueprint files, validates
   their shape (via Zod) and cross-field semantics (via
   `src/blueprint/semantics.ts`), and exposes a builder for scaffolding new
   blueprints from templates.
4. **Agent Generator** (`src/generator/`) — Pure function: `AgentBlueprint -> GeneratedAgentFile`.
   Renders YAML frontmatter (`name`, `description`, `tools`, `model`) plus a
   structured Markdown body (role, responsibilities, workflow, safety rules,
   reporting rules, validation/version metadata, documentation links) and
   writes it to `.claude/agents/<name>.md`.
5. **Agent Validator** (`src/validator/`) — Independently re-parses the
   generated `.md` file and runs a battery of rules (completeness, duplicate
   names/responsibilities, invalid tools, missing sections, broken doc
   references, formatting, architecture compliance). Invalid agents are
   rejected before they ever reach the registry.
6. **Agent Registry** (`src/registry/`) — A JSON-backed store
   (`registry/agents.registry.json`) recording id, version, owner,
   capabilities, dependencies, status, tags, and a full update history for
   every agent ever generated. This is the durable ledger; `.claude/agents/`
   is just the latest materialized output.

## Layering rules

Dependencies only ever point "downward":

```
constants  ─┐
             ├──▶ types ──▶ blueprint ──▶ generator ──▶ validator ──▶ registry ──▶ cli
utils      ─┘
```

- `constants/` and `utils/` have no dependencies on the rest of the factory.
- `types/` depends only on `constants/` (e.g. the blueprint schema validates
  tool names against `constants/tools.ts`).
- `blueprint/` (the engine) depends on `types/` for the schema, plus
  `templates/` for scaffolding.
- `generator/` depends on `types/` and `blueprint/`.
- `validator/` depends on `types/` only — it deliberately does **not** import
  the generator, so it validates the agent file as it actually exists on disk,
  not the in-memory object that produced it.
- `registry/` depends on `types/` and reads validator output, never the other
  way around.
- `cli/` is the only layer allowed to import everything; it orchestrates the
  pipeline end-to-end.

This means: no future agent type, template, or tool requires touching the
generator/validator/registry internals. Adding a category is a one-line
constant change plus one new template file.

## Why a Registry separate from `.claude/agents/`

`.claude/agents/*.md` is what Claude Code actually reads at runtime. It is
intentionally "dumb" — plain frontmatter + Markdown, nothing the Claude Code
agent loader doesn't already understand. All of the factory's *structured*
metadata (capabilities, dependencies, status, full history) lives in the
registry instead of being smuggled into custom frontmatter keys that an agent
loader might ignore or choke on. The registry is what makes the factory
queryable and auditable at scale; the `.md` file is just the deployable
artifact.

## Extensibility points

See `docs/EXTENSION_GUIDE.md` for the concrete steps, but at a glance:

- **New agent category** → add to `src/constants/categories.ts` + one new file
  in `src/templates/`.
- **New tool the platform exposes** → add to `src/constants/tools.ts`.
- **New validation rule** → add a function in `src/validator/rules/` and wire
  it into `src/validator/validateAgent.ts`.
- **New blueprint field** → extend `AgentBlueprintSchema` in
  `src/types/blueprint.ts`, bump `BLUEPRINT_SCHEMA_VERSION`, update the
  generator's renderer and the validator's section list together.

No phase of this pipeline ever hardcodes a specific agent. The factory only
ever knows about blueprints, templates, and rules.
