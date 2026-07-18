# Workflow — SaaS Foundation Agent

## Execution Steps

1. **Receive** — Accept upstream artifacts from founder via the Task Queue.
2. **Validate Input** — Confirm upstream artifacts are complete; escalate to founder on missing/ambiguous data.
3. **Design/Implement** — Carry out this agent's responsibilities against the MVP scope only.
4. **Self-Score** — Assign confidence and qualityScore against this agent's VALIDATION.md criteria.
5. **Publish Artifacts** — Register outputs via the Artifact Manager with explicit traceability entries.
6. **Hand Off** — Deliver structured output to solution-architect-app; announce via the Event Bus.
7. **Memory Update** — Record outcome in this agent's namespace in shared memory.

## Failure Handling

- Missing/ambiguous upstream input: escalate to founder, do not guess.
- Failed self-validation: retry once against corrected input, then escalate.
- Scope creep detected (feature not in MVP scope): flag and defer, do not silently implement.
