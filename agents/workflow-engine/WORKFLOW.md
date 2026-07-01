# Workflow — Workflow Engine

## Execution Steps

1. **Receive** — Accept task from orchestrator-agent, task-planner via the Master Orchestrator's Task Queue.
2. **Load Context** — Request context load from the Context Manager for this task's namespace.
3. **Validate Input** — Assert input against INPUT_SCHEMA; escalate to orchestrator-agent on schema failure.
4. **Execute** — Carry out the responsibilities listed in README.md, step by step.
5. **Publish Artifacts** — Register all output artifacts via the Artifact Manager.
6. **Announce** — Emit a task.completed event on the Event Bus with the artifact IDs.
7. **Hand Off** — Notify orchestrator-agent, agent-generator, quality-controller via the Communication Bus that results are ready.
8. **Memory Update** — Write task outcome and key results to the agent namespace in shared memory.

## Failure Handling

- On any step 3–8 failure, emit task.failed with a structured error payload.
- The Master Orchestrator's retry policy applies (max 3 retries with exponential backoff).
- After 3 failures, escalate to orchestrator-agent via the Approval System.
