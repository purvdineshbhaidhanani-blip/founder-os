# Tests

Full rules in [`standards/testing.md`](../../../standards/testing.md).

```
tests/
  unit/          # pure functions, business logic, validation schemas — no network, no DB
  integration/   # API routes against a real test database
  e2e/           # Playwright — critical user journeys in a real browser
```

No PR that adds a route or business logic merges without a test in the
matching folder here — see `standards/testing.md` for what's required per
change and the CI gate that enforces it.
