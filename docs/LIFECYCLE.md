# Agent Lifecycle

An agent is the long-lived artifact the factory produces. Its lifecycle
is the sequence of states it can occupy, the events that move it between
states, and the invariants the factory enforces at every transition.

For the higher-level pipeline (Blueprint → Generator → Validator →
Registry), see [ARCHITECTURE.md](./ARCHITECTURE.md). For the rules
applied at each transition, see
[VALIDATION_PROCESS.md](./VALIDATION_PROCESS.md).

## States

The registry tracks each agent under one of these statuses:

| Status        | Meaning                                                         |
| ------------- | --------------------------------------------------------------- |
| `draft`       | Blueprint exists but the agent file has not been generated yet  |
| `active`      | Generated, validated, registered, and available for use         |
| `deprecated`  | Still in the registry but no longer recommended; do not extend  |
| `archived`    | Hidden from listings; kept only for historical reference        |

The set of legal statuses lives in `src/types/common.ts` as
`AGENT_STATUSES`. Adding a status requires updating both the type and
every place that branches on it.

## Transitions

```
   ┌────────┐   author blueprint
   │  draft │ ◄────────────────────────  (initial state for any new agent)
   └────┬───┘
        │  generate (passes validation)
        ▼
   ┌────────┐   re-generate (blueprint hash changes)
   │ active │ ─────────────────────────► active' (regenerated history entry)
   └────┬───┘
        │  deprecate
        ▼
   ┌────────────┐
   │ deprecated │
   └────┬───────┘
        │  archive
        ▼
   ┌──────────┐
   │ archived │
   └──────────┘
```

The factory itself only writes `draft` and `active`. Status changes to
`deprecated` or `archived` are done explicitly via the registry helpers.

## Events that mutate registry state

| Event           | Trigger                                  | Effect on `updateHistory` |
| --------------- | ---------------------------------------- | ------------------------- |
| `created`       | First successful registration            | One entry, action `created` |
| `regenerated`   | Re-registration with a different hash    | New entry, action `regenerated` |
| `updated`       | `setAgentStatus()` to an interim status  | New entry, action `updated` |
| `deprecated`    | `setAgentStatus("deprecated")`           | New entry, action `deprecated` |
| `archived`      | `setAgentStatus("archived")`             | New entry, action `archived` |
| (no-op)         | Re-registration with identical hash      | No change                 |

Every entry stores `{ version, timestamp, action, note? }` so the
history is auditable end-to-end.

## What the factory guarantees

* An agent is `active` in the registry **only if** it currently exists
  on disk under `.claude/agents/` and passes every validation rule.
* The registry's `blueprintHash` for an `active` agent matches the
  blueprint that produced the on-disk file. If they disagree, generation
  is required.
* Re-running `generate` on an unchanged blueprint is a no-op — same
  bytes on disk, same registry entry.

## What the factory does not do

* The factory does not move agents to `deprecated` or `archived`
  automatically. That decision is human, and so are the calls.
* The factory does not delete agent files on `archived`. The Markdown
  stays on disk so historical context remains discoverable.
* The factory does not run the agent. Lifecycle is about the
  artifact's state in the catalog; runtime behavior is up to Claude
  Code.
