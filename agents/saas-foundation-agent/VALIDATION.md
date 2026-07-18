# Validation &amp; Acceptance Criteria — SaaS Foundation Agent

## Agent Structural Validation

- Blueprint passes `validateBlueprint()` with zero errors
- Generated agent file passes `validateGeneratedAgent()` with zero blocking issues
- Agent registered in `registry/agents.registry.json` with status `active`

## Behavioural Acceptance Criteria

1. **The same 13 modules, in the same order, are generated for every SaaS idea without exception**
2. **No module ever contains domain-specific functionality — only the universal SaaS baseline**
3. **Every module is complete: Purpose, Features, Screens, User Flow, UX Best Practices, Common Mistakes, Future Improvements, all present**

## Quality Gates

- Deliverable traces every decision to an upstream artifact
- No MVP-scope violations (features beyond Product Discovery Package MVP scope)
- Integration test confirms message round-trip: founder → saas-foundation-agent → solution-architect-app
- Memory read/write round-trip confirmed in agent namespace
