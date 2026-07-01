# Validation & Acceptance Criteria — Agent Registry

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **Registry is always consistent with the .claude/agents/ folder**
2. **Every registered agent is discoverable within one event cycle**
3. **No orphaned registry entries — deregistration is tracked with a reason**

## Quality Gates

- Validation suite for this agent runs without failures
- Integration test confirms message round-trip: agent-generator → agent-registry → orchestrator-agent, workflow-engine
- Memory read/write round-trip confirmed in agent namespace
- No duplicate agents with overlapping responsibilities detected by the validator
