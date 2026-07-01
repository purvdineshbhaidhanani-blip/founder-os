# Validation &amp; Acceptance Criteria — Developer Agent

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **Every MVP user story's acceptance criteria has corresponding implemented code and at least one test**
2. **No architecture spec is deviated from without an explicit, logged decision escalated to the owning architect**
3. **Code ships with structured logging and error handling matching the backend architecture's conventions**

## Quality Gates

- Deliverable traces every decision to an upstream artifact
- No MVP-scope violations (features beyond Product Discovery Package MVP scope)
- Integration test confirms message round-trip: application-architect, backend-architect, database-architect, ai-architect → developer-agent → qa-engineer-app
- Memory read/write round-trip confirmed in agent namespace
