# Validation & Acceptance Criteria — Task Planner

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **Every task batch is parallelised to the extent its dependency graph allows**
2. **Critical path is computed and surfaced before execution begins**
3. **Reassignment on blocker completes within one planning cycle**

## Quality Gates

- Validation suite for this agent runs without failures
- Integration test confirms message round-trip: orchestrator-agent, project-manager → task-planner → workflow-engine, orchestrator-agent
- Memory read/write round-trip confirmed in agent namespace
- No duplicate agents with overlapping responsibilities detected by the validator
