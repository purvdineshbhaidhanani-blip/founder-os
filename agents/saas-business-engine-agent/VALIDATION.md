# Validation &amp; Acceptance Criteria — SaaS Business Engine Agent

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **The same 10 business sections, in the same order, are generated for every SaaS idea without exception**
2. **No section ever contains domain-specific business logic or implementation-layer detail (database/API/backend/security/testing/deployment) — only the universal SaaS business-rules baseline**
3. **Every section is complete: Purpose, Features, Business Rules, User Flow, Best Practices, Common Mistakes, Future Improvements, all present**

## Quality Gates

- Deliverable traces every decision to an upstream artifact
- No MVP-scope violations (features beyond Product Discovery Package MVP scope)
- Integration test confirms message round-trip: founder → saas-business-engine-agent → solution-architect-app
- Memory read/write round-trip confirmed in agent namespace
