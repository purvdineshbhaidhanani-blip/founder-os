# Validation & Acceptance Criteria — Report Generator

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **The founder receives a complete daily summary with zero manual compilation**
2. **Every report references its source data with artifact IDs for traceability**
3. **On-demand reports are produced within 5 seconds of request**

## Quality Gates

- Validation suite for this agent runs without failures
- Integration test confirms message round-trip: logger-agent, project-manager, orchestrator-agent → report-generator → orchestrator-agent, knowledge-manager
- Memory read/write round-trip confirmed in agent namespace
- No duplicate agents with overlapping responsibilities detected by the validator
