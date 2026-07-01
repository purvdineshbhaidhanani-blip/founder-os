# Validation & Acceptance Criteria — Memory Manager

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **No stale entry survives past its TTL by more than one cleanup cycle**
2. **Recall latency is sub-millisecond for in-memory stores**
3. **Every agent can address any memory namespace without coupling to its storage backend**

## Quality Gates

- Validation suite for this agent runs without failures
- Integration test confirms message round-trip: orchestrator-agent, context-manager → memory-manager → orchestrator-agent, context-manager, knowledge-manager
- Memory read/write round-trip confirmed in agent namespace
- No duplicate agents with overlapping responsibilities detected by the validator
