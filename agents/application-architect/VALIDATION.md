# Validation &amp; Acceptance Criteria — Application Architect

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **Every MVP user story maps to at least one screen and one navigation path**
2. **Frontend spec names an explicit platform target list (never assumes web-only silently)**
3. **No frontend architecture decision contradicts the System Architecture Document**

## Quality Gates

- Deliverable traces every decision to an upstream artifact
- No MVP-scope violations (features beyond Product Discovery Package MVP scope)
- Integration test confirms message round-trip: solution-architect-app → application-architect → developer-agent
- Memory read/write round-trip confirmed in agent namespace
