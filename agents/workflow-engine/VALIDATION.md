# Validation & Acceptance Criteria — Workflow Engine

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **Every workflow step is idempotent and auditable**
2. **Cycle detection runs at definition time — never at execution time**
3. **Any workflow can be resumed from checkpoint after a cold restart**

## Quality Gates

- Validation suite for this agent runs without failures
- Integration test confirms message round-trip: orchestrator-agent, task-planner → workflow-engine → orchestrator-agent, agent-generator, quality-controller
- Memory read/write round-trip confirmed in agent namespace
- No duplicate agents with overlapping responsibilities detected by the validator
