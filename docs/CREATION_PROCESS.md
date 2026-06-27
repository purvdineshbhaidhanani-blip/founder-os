# Creation Process

This document walks the full path from "I need a new agent" to "the
agent is registered and ready to use." It is intentionally concrete —
every step refers to a real CLI command, file path, or source module.

For the static design, see [ARCHITECTURE.md](./ARCHITECTURE.md).
For the rules applied along the way, see
[VALIDATION_PROCESS.md](./VALIDATION_PROCESS.md). For day-to-day CLI
reference, see [USAGE.md](./USAGE.md).

## The pipeline at a glance

```
template ──► blueprint ──► validate ──► generate ──► validate ──► write + register
```

Each step is a pure transformation, and each step can fail loudly
without corrupting the previous one's output.

## Step 1 — Pick a category template

The Template Library (`src/templates/`) ships a default for each agent
category. Categories live in `src/constants/categories.ts`. Use the CLI
to scaffold:

```bash
agent-factory blueprint new engineering \
  --name backend-api-implementer \
  --display-name "Backend API Implementer" \
  --owner platform-team
```

Under the hood this calls `getTemplate(category).build(input)` and
writes the resulting blueprint to
`blueprints/<name>.blueprint.json`.

Templates are starting points, not finished products. They get the
boilerplate right (model preference, default permissions, sane
collaborators, sensible failure behavior) so you can focus on what's
specific to the new agent.

## Step 2 — Refine the blueprint

Open the new blueprint and adjust the fields the template can't know:

* **identity.summary** — one sentence, 10–240 chars, describing what
  the agent does.
* **responsibilities** — the concrete things this agent owns.
* **inputs / outputs** — what callers must provide and what they
  receive.
* **workflow** — ordered steps, no gaps.
* **allowedTools / permissions** — minimal set the agent needs. The
  semantic validator will reject combinations that contradict
  themselves (e.g., `shell: "none"` with `Bash` in `allowedTools`).
* **communicationProtocol.collaboratesWith** — names of other agents,
  not free-form descriptions.
* **documentationLinks** — relative paths under `docs/` that explain
  the agent's domain.

Run the validator early and often:

```bash
agent-factory blueprint validate blueprints/backend-api-implementer.blueprint.json
```

## Step 3 — Generate the agent

```bash
agent-factory generate blueprints/backend-api-implementer.blueprint.json
```

This single command runs the entire pipeline:

1. **Load + validate the blueprint** (`src/blueprint/`). Schema errors,
   semantic errors, or unknown tools fail here.
2. **Render the agent Markdown** in memory (`src/generator/`). Frontmatter,
   17 required sections, version metadata, and documentation links are
   all generated from the blueprint — no hand-editing of the agent file
   ever.
3. **Validate the rendered agent** against existing agents in
   `.claude/agents/` (`src/validator/`). Duplicate names, overlapping
   responsibilities, broken doc links, unknown collaborators, and
   permission/tool drift between frontmatter and body are all detected
   here.
4. **Write to disk + register** (`src/registry/`). Only if every prior
   step succeeded: the file is written to
   `.claude/agents/<name>.md` and the registry is upserted.

If any step fails, nothing is written to disk.

## Step 4 — Re-generate when the blueprint changes

Re-running `generate` is idempotent:

* If the blueprint hash matches the registry's record, nothing changes.
* If the hash differs, the Markdown is re-rendered and the registry
  entry gains a `regenerated` history entry.

This is the right way to update an agent. Editing
`.claude/agents/<name>.md` by hand is not — manual edits will be wiped
by the next generation.

## Step 5 — Move the agent through its lifecycle

See [LIFECYCLE.md](./LIFECYCLE.md). The factory leaves an agent in
`active` after a successful generation; transitions to `deprecated` or
`retired` are explicit decisions made through the registry helpers.

## What to do when something goes wrong

* **Schema error** — the blueprint is missing or mis-typing a field.
  The Zod error path tells you exactly which one.
* **Semantic error** — the blueprint is internally inconsistent (e.g.,
  promises a network call with `network: "none"`). Fix the blueprint, not
  the rule.
* **Agent validation error** — the rendered agent collides with another
  one in `.claude/agents/`, or references docs that don't exist. Fix the
  blueprint or fix the collaborator, not the generated file.
* **Registry error** — usually a corrupted JSON file. Restore from
  git history; the registry file is checked in for exactly this reason.
