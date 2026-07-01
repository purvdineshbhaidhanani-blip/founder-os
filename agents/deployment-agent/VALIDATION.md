# Validation &amp; Acceptance Criteria — Deployment Agent

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **No deployment package ships without a passing smoke test**
2. **Every required environment variable/secret is documented, never hardcoded**
3. **Rollback procedure exists and is documented before first production deploy**

## Quality Gates

- Deliverable traces every decision to an upstream artifact
- No MVP-scope violations (features beyond Product Discovery Package MVP scope)
- Integration test confirms message round-trip: qa-engineer-app → deployment-agent → founder
- Memory read/write round-trip confirmed in agent namespace
