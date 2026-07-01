# Validation & Acceptance Criteria — Orchestrator Agent

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **Zero unowned tasks — every subtask has a responsible agent**
2. **Full dependency graph computed before any task is dispatched**
3. **Founder is notified within one tick when any critical-path task blocks**

## Quality Gates

- Validation suite for this agent runs without failures
- Integration test confirms message round-trip: founder → orchestrator-agent → agent-generator, agent-registry, workflow-engine, task-planner, project-manager
- Memory read/write round-trip confirmed in agent namespace
- No duplicate agents with overlapping responsibilities detected by the validator
