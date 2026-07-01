# Validation & Acceptance Criteria — Project Manager

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **Every active initiative has an up-to-date milestone tracker**
2. **Delivery risk is visible to the founder at least 48 hours before it becomes critical**
3. **Cross-department dependencies are resolved before the dependent task starts**

## Quality Gates

- Validation suite for this agent runs without failures
- Integration test confirms message round-trip: orchestrator-agent, task-planner → project-manager → orchestrator-agent, report-generator
- Memory read/write round-trip confirmed in agent namespace
- No duplicate agents with overlapping responsibilities detected by the validator
