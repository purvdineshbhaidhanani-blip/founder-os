# Validation & Acceptance Criteria — Context Manager

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **No task ever starts without its required context loaded**
2. **Token budget is never exceeded — trim is applied before dispatch**
3. **Context lineage is traceable from task back to its originating goal**

## Quality Gates

- Validation suite for this agent runs without failures
- Integration test confirms message round-trip: orchestrator-agent, memory-manager → context-manager → orchestrator-agent, agent-generator, workflow-engine
- Memory read/write round-trip confirmed in agent namespace
- No duplicate agents with overlapping responsibilities detected by the validator
