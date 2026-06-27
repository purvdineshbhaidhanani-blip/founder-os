# AI Founder OS — Agent Factory

The internal platform that designs, generates, validates, and registers every
Claude Code agent used across AI Founder OS. This repository builds the
**factory**, not individual agents — agents are a generated output, never
hand-written.

This repository is fully self-contained and does not depend on, read from, or
modify any other repository.

## Quick start

```bash
npm install
npm run build

# Scaffold a new blueprint from a template
npm run factory -- blueprint new my-new-agent --category engineering

# Validate, generate, and register an agent from a blueprint
npm run factory -- generate blueprints/my-new-agent.blueprint.json

# List everything the factory has ever generated
npm run factory -- registry list
```

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — pipeline, layering, extensibility
- [`docs/STANDARDS.md`](docs/STANDARDS.md) — engineering principles and conventions
- [`docs/USAGE.md`](docs/USAGE.md) — full CLI reference
- [`docs/LIFECYCLE.md`](docs/LIFECYCLE.md) — agent lifecycle states
- [`docs/CREATION_PROCESS.md`](docs/CREATION_PROCESS.md) — blueprint → agent, step by step
- [`docs/VALIDATION_PROCESS.md`](docs/VALIDATION_PROCESS.md) — what gets checked and why
- [`docs/EXTENSION_GUIDE.md`](docs/EXTENSION_GUIDE.md) — adding categories, tools, rules, fields

## Repository layout

```
src/
  constants/   versioning, paths, tool whitelist, agent categories
  types/       shared types + the AgentBlueprint schema (Zod)
  utils/       logger, Result type, fs helpers, slug/id/hash, frontmatter (de)serialization
  blueprint/   blueprint loader + semantic validation + scaffolding
  generator/   blueprint -> .claude/agents/*.md
  validator/   rule-based validation of generated agent files
  registry/    JSON-backed ledger of every generated agent
  templates/   reusable blueprint templates per category
  cli/         `agent-factory` command-line entrypoint
blueprints/    blueprint source files (input)
.claude/agents/  generated agent files (output)
registry/      registry/agents.registry.json (the ledger)
docs/          architecture & process documentation
tests/         vitest suite
```
