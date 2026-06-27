# Validation Process

Validation exists at two levels in the factory:

1. **Blueprint validation** — the source artifact must be internally
   consistent before anything is generated.
2. **Agent validation** — the generated Markdown must be complete,
   non-conflicting with siblings, and architecturally compliant before
   it is written to disk.

Both layers are pure functions: they take an object, return a
`ValidationReport`, and never mutate state.

## Why two layers

Blueprint validation catches the things that are wrong in the source
of truth — invalid categories, contradictory permissions, duplicate
responsibility entries, etc.

Agent validation catches the things that are only wrong in context — a
name that collides with another agent on disk, a documentation link
that doesn't resolve, a body section that drifted from the frontmatter
during a manual edit.

Keeping them separate means: a blueprint is portable (you can validate
it without a filesystem), and the registry can be re-validated at any
time without re-running the generator.

## Blueprint validation (`src/blueprint/validate.ts` + `semantics.ts`)

### Schema rules (Zod, `src/types/blueprint.ts`)

The Zod schema is the spec. Highlights:

* `identity.name` — kebab-case, `/^[a-z0-9]+(-[a-z0-9]+)*$/`.
* `identity.summary` — 10–240 characters.
* `identity.category` — one of the values in `AGENT_CATEGORIES`.
* `permissions.filesystem` — `"none" | "read-only" | "read-write"`.
* `permissions.network` — `"none" | "outbound-only" | "full"`.
* `permissions.shell` — `"none" | "restricted" | "full"`.
* `allowedTools[]` — every entry must be a known core tool, the
  wildcard `*`, or an MCP tool name prefixed with `mcp__`.
* `executionConstraints.autonomyLevel` — `"supervised" |
  "semi-autonomous" | "autonomous"`.

Anything failing the schema is a hard error.

### Semantic rules (`src/blueprint/semantics.ts`)

Cross-field checks that can't be expressed as a single field
constraint:

| Rule | What it catches |
| ---- | --------------- |
| `checkWorkflowOrdering` | Workflow steps must be contiguous, starting at 1, no gaps |
| `checkPermissionToolConsistency` | `Bash` requires `shell !== "none"`; `WebFetch`/`WebSearch` require `network !== "none"`; `Write`/`Edit` require `filesystem === "read-write"` |
| `checkMemoryAccessConsistency` | `scope: "none"` is incompatible with non-empty `readPaths`/`writePaths` or `persistent: true` |
| `checkAutonomyConsistency` | `autonomyLevel: "supervised"` with `requiresHumanApproval: false` is flagged as a warning |
| `checkSelfCollaboration` | An agent cannot list itself in `collaboratesWith` |
| `checkUniqueIoNames` | Input names and output names must each be unique within their list |
| `checkDuplicateResponsibilities` | Responsibility strings must be distinct (case-insensitive, trimmed); duplicates are a warning |
| `checkForbiddenVsAllowed` | A `forbiddenAction` string must not also appear as an allowed tool name |

Most semantic checks are errors; the autonomy/responsibility checks are
warnings (they may surface real bugs but do not always block generation).

## Agent validation (`src/validator/`)

Agent validation runs over a parsed Markdown file (the output of the
generator, or any existing file in `.claude/agents/`). The orchestrator
is `validateAgent(candidate, context)` in
`src/validator/validateAgent.ts`.

### Rules

| Rule | Module | Notes |
| ---- | ------ | ----- |
| Completeness | `rules/completeness.ts` | `name`, `description`, `tools` present in frontmatter; filename matches `name`; slug shape enforced |
| Sections | `rules/sections.ts` | Every entry in `REQUIRED_AGENT_SECTIONS` appears exactly once |
| Tools | `rules/tools.ts` | Each tool in frontmatter is a known core tool, `*`, or an `mcp__`-prefixed MCP tool |
| Duplicates | `rules/duplicates.ts` | Names cannot collide; responsibilities are compared via Jaccard similarity (≥0.8 → error, ≥0.5 → warning) |
| References | `rules/references.ts` | Every relative documentation link must resolve; collaborators must reference a known agent |
| Formatting | `rules/formatting.ts` | Frontmatter must be at the top, exactly one H1, no tabs, no trailing whitespace, trailing newline present |
| Architecture | `rules/architecture.ts` | File must live directly in `.claude/agents/`; tools in frontmatter must match the Permissions section in the body |

### Severities

* **Error** — blocks generation. The agent will not be written or
  registered.
* **Warning** — does not block, but is surfaced in the CLI output and
  the registry's history notes.

### Context

`loadValidatorContext()` walks the on-disk agents to build the sibling
set used by the duplicate and reference rules. This is why agent
validation cannot run in isolation: it depends on what already exists.

## Reading a `ValidationReport`

```ts
interface ValidationReport {
  valid: boolean;
  issues: ValidationIssue[];
}

interface ValidationIssue {
  code: string;
  severity: "error" | "warning";
  message: string;
  path?: string;
}
```

`valid` is `true` if and only if there are no `error`-severity issues.
Warnings can be present in a valid report.

Use `reportToString()` (in `src/types/validation.ts`) for the canonical
CLI rendering.
