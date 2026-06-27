# Extension Guide

The factory is meant to grow. This guide names the four most common
extension points and the exact files you have to touch for each one.

For the underlying contracts, see [ARCHITECTURE.md](./ARCHITECTURE.md)
and [VALIDATION_PROCESS.md](./VALIDATION_PROCESS.md).

## Add a new category

Categories are the top-level taxonomy for agents (engineering,
planning, …). To add one:

1. Append the category string to `AGENT_CATEGORIES` in
   `src/constants/categories.ts`. The `AgentCategory` type is derived
   from this array, so the compiler will list every place that needs an
   update.
2. Add a default template at `src/templates/<category>.ts`. Use one of
   the existing templates as a copy-paste starting point and adjust the
   role, responsibilities, permissions, allowed tools, model
   preference, and failure behavior.
3. Register the template in `src/templates/registry.ts` so
   `getTemplate(category)` resolves it.
4. Add an export in `src/templates/index.ts`.

The Zod schema picks up the new category automatically because it
sources its enum from `AGENT_CATEGORIES`.

## Add a new tool

Tools are the operational surface area agents are allowed to use.

1. Add the tool name to `CORE_TOOLS` in `src/constants/tools.ts`. Keep
   the list alphabetised — it's easier to spot duplicates that way.
2. If the tool implies a permission requirement (`Bash` requires
   shell access, `WebFetch` requires network), add a corresponding
   clause to `checkPermissionToolConsistency` in
   `src/blueprint/semantics.ts`. The pattern is straightforward: if the
   tool is present and the permission contradicts it, emit an error.

MCP tools (`mcp__*`) are accepted by the schema without a registry
update because they are namespaced — the prefix itself is the
guarantee. If you want to allow-list specific MCP tools, add them to a
new constant and tighten the refinement in
`src/types/blueprint.ts`.

## Add a new validation rule

Validation rules live in `src/validator/rules/`. Each rule is a
function that takes the agent candidate (and optional context) and
returns a `ValidationReport`.

1. Create `src/validator/rules/<rule>.ts`. Export one function that
   produces a `ValidationReport`. Prefer pure functions; pull from
   `context` instead of touching the filesystem when possible.
2. Wire the rule into `validateAgent` in
   `src/validator/validateAgent.ts` — merge its report with the others
   via `mergeReports()`.
3. Decide on the severity. Errors block generation, warnings don't.
4. Document the new rule in
   [VALIDATION_PROCESS.md](./VALIDATION_PROCESS.md).

If the rule applies to blueprints instead of generated agents, add it
to `src/blueprint/semantics.ts` next to the existing `check*` functions
and merge it into `validateBlueprintSemantics`.

## Add a new blueprint field

The blueprint is the contract every other module depends on, so the
change radiates outward:

1. Add the field to the Zod schema in `src/types/blueprint.ts`. Decide
   whether it is required or optional and document the constraint in
   the schema itself.
2. Bump `BLUEPRINT_SCHEMA_VERSION` in `src/constants/factory.ts` if the
   field is required or changes existing semantics. Optional, additive
   fields don't need a bump.
3. Render the field in the generator. `src/generator/renderBody.ts`
   owns the body sections; pick the right section or add a new one
   (and add the section name to `REQUIRED_AGENT_SECTIONS` in
   `src/types/agent.ts` if it should always be present).
4. If the field has cross-field implications, add a semantic check in
   `src/blueprint/semantics.ts`.
5. Update every template (`src/templates/*.ts`) so existing categories
   produce blueprints that satisfy the new constraint.
6. Update [VALIDATION_PROCESS.md](./VALIDATION_PROCESS.md) and, if
   user-visible, [USAGE.md](./USAGE.md).

## A note on backwards compatibility

The factory is the canonical writer of every agent file. The honest
way to evolve a contract is to change it, regenerate every agent, and
let the registry's `regenerated` history entry record the migration.

Backwards-compatibility shims, fallback paths for the "old shape," and
silent defaults are anti-patterns here. If a field exists in the
schema, it should exist in every blueprint; if a section is required in
the body, every body should have it. When in doubt, see
[STANDARDS.md](./STANDARDS.md).
