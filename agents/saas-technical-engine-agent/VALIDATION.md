# Validation &amp; Acceptance Criteria — SaaS Technical Engine Agent

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **The same 20 technical sections, in the same order, are generated for every SaaS idea without exception**
2. **No section ever contains UI design, pricing, business rules, or a bespoke per-project decision — only the universal, reusable technical pattern**
3. **Every section is complete: Purpose, Components, Architecture, Best Practices, Common Mistakes, Future Improvements, all present**

## Quality Gates

- Deliverable traces every decision to an upstream artifact
- No MVP-scope violations (features beyond Product Discovery Package MVP scope)
- Integration test confirms message round-trip: founder → saas-technical-engine-agent → solution-architect-app
- Memory read/write round-trip confirmed in agent namespace
