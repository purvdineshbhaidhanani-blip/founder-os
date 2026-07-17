# Tool Execution Engine (`src/runtime/tools/`)

Loop 3: lets agents ACT, not just think. Built entirely inside the existing
`src/runtime/` tree, alongside `agents/`, `approval/`, `events/`, `memory/` —
one more runtime capability folder, not a new subsystem family. Reuses the
Registry, Memory, EventBus, ApprovalSystem, and LLM Adapter unmodified;
nothing here duplicates them.

## Architecture

```
src/runtime/tools/
  types.ts                     ToolDefinition / ToolResult / permission types
  sandbox.ts                   workspace path containment (resolveSandboxedPath)
  json-schema.ts                minimal Zod -> JSON Schema (for LLM tool-calling)
  registry.ts                   ToolRegistry — register/list/describe, no switch
  permissions.ts                 PermissionEvaluator — reuses ApprovalSystem
  executor.ts                    ToolExecutor — validate/permit/run/retry/timeout
  implementations/
    file-tools.ts                 read/write/append/mkdir/delete/move/copy/list/search
    shell-tools.ts                 run_bash/run_powershell (+ shared runProcess)
    git-tools.ts                   status/diff/log/branch/create_branch/checkout/commit
    http-tools.ts                  get/post/put/patch/delete (SSRF-guarded)
    search-tools.ts                text_search/pattern_search/repository_search
  index.ts                       barrel + BUILT_IN_TOOLS + createDefaultToolRegistry()
```

## Execution lifecycle

```
ToolExecutor.execute(toolId, input, context)
  1. registry.get(toolId)              — 404 if unknown
  2. tool.inputSchema.safeParse(input)  — reject bad input before anything runs
  3. PermissionEvaluator.evaluate(tool) — allowed / denied / ask-user / read-only / workspace-only
  4. for attempt in 1..retryPolicy.maxAttempts:
       race(tool.run(input, context-with-combined-signal), timeout(tool.timeoutMs))
       success -> return ToolResult{status:"success", data, metadata}
       failure -> publish tool.retry, exponential backoff, try again
  5. exhausted -> ToolResult{status:"failure", error, metadata}
```

Every step publishes on the existing `EventBus` when one is supplied:
`tool.started`, `tool.finished`, `tool.failed`, `tool.retry`, `tool.cancelled`.

## Permission model

Five modes on every `ToolDefinition.permission`:

| Mode | Behavior |
|------|----------|
| `allowed` | Runs unconditionally. |
| `denied` | Never runs. |
| `ask-user` | Gates on the EXISTING `ApprovalSystem` (`src/runtime/approval`). No `ApprovalSystem` configured → denied, never silently allowed. |
| `read-only` | Runs only if the tool's `capabilities` contain no mutating tag (`write`/`execute`/`delete`/`network-write`). |
| `workspace-only` | Passes through as allowed; the tool body itself enforces containment via `sandbox.ts`. |

Defaults shipped: all reads (`read_file`, `list_directory`, `search_files`,
`text_search`, `pattern_search`, `repository_search`, `git_status`/`diff`/
`log`/`branch`, `http_get`) are `allowed`/`read-only`. Every mutation
(`write_file`, `delete_file`, `move_file`, `copy_file`, `create_folder`,
`run_bash`, `run_powershell`, `git_commit`/`checkout`/`create_branch`,
`http_post`/`put`/`patch`/`delete`) defaults to `ask-user`. Nothing mutates
silently.

## Security model

- **Workspace sandboxing** (`sandbox.ts`): every path argument is resolved
  through `resolveSandboxedPath(root, candidate)`, which rejects `..`
  traversal and absolute paths outside the root — verified against real
  traversal attempts in `tests/runtime/tools/sandbox.test.ts` and against
  every file/shell/git/search tool's own path arguments.
- **Shell execution**: no string "sanitization" is attempted — shell
  metacharacters defeat any blocklist. The real guard is the permission
  system (`ask-user` by default) plus a sandboxed `cwd`. Real process
  cancellation via Node's `child_process` `signal` option (verified: an
  aborted `sleep 30` actually dies in milliseconds, not 30 seconds).
- **HTTP**: every request is validated by the EXISTING SSRF guard
  (`validateSnapshotTargetUrl`, exported from
  `src/monitoring/providers/web-snapshot.ts` for this reuse) — blocks
  loopback/private/link-local/cloud-metadata hosts and non-http(s) schemes,
  verified without ever calling `fetch`.
- **Timeout is a real race, not cooperative-only**: `ToolExecutor` races
  `tool.run()` against a timeout promise, so even a tool body that ignores
  its `AbortSignal` cannot hang the executor past `timeoutMs` (the
  underlying promise may still run in the background — no way to force-kill
  an arbitrary in-flight Promise in JS; documented, not hidden).

## How to create a new tool

Implement a `ToolDefinition` (see any file in `implementations/`):

```ts
const myTool: ToolDefinition<{ x: string }, { y: string }> = {
  id: "my_tool",
  name: "My Tool",
  description: "...",
  capabilities: ["read"],           // or "write"/"execute"/"delete"/"network-write"
  permission: { mode: "allowed", reason: "..." },
  inputSchema: z.object({ x: z.string() }),
  timeoutMs: 10_000,
  retryPolicy: { maxAttempts: 2, baseDelayMs: 200 },
  async run(input, context) {
    // context.workingDirectory is the sandbox root — resolve any path via
    // resolveSandboxedPath(context.workingDirectory, input.somePath).
    return { y: input.x };
  },
};
```

## How to register a tool

Add it to the relevant array in `implementations/*.ts` (or a new file) and
include it in `BUILT_IN_TOOLS` in `index.ts`. `createDefaultToolRegistry()`
picks it up automatically — no switch statement anywhere needs to change.

## How Runtime discovers tools

`ToolRegistry.describe()` returns every registered tool as a
`ToolDescriptor` (JSON-Schema `inputJsonSchema` included), which
`AgentExecutor` maps into `LlmTool[]` and offers to the model on every
completion request when `ExecuteAgentOptions.tools` is set.

## How agents invoke tools

`AgentExecutor.executeAgent(agentId, task, context, { tools, toolWorkingDirectory })`:
1. Builds the prompt as in Loop 2, now also passing `tools` to the LLM Adapter.
2. If the model's response includes `toolCalls`, each is run via
   `ToolExecutor.execute()` — the model never touches the filesystem/shell/
   network directly.
3. Each tool's result is appended as a `role: "tool"` message and the loop
   continues (bounded by `maxToolTurns`, default 5) until the model responds
   with no further tool calls.
4. The final `AgentExecutionResult.toolCalls` records every call made
   (name, arguments, status, duration) for transparency.

Omitting `tools` entirely reproduces Loop 2's exact behavior — this is
opt-in and fully backward compatible (verified in
`tests/runtime/tool-agent-integration.test.ts`).

## Known limitations

- An SSRF-rejected HTTP request is currently retried per the tool's normal
  retry policy even though a blocked target will always fail identically —
  wasteful, not unsafe (the block itself is never bypassed).
- Shell/PowerShell tools have no OS-level jail (no chroot/container) beyond
  sandboxed `cwd` + the permission gate — documented, not oversold.
- `zodToJsonSchema` supports only the schema shapes this repo's own tools
  use (object/string/number/boolean/array/enum/optional/default/nullable),
  not the full Zod surface.
