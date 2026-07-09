# 16 · Technical Foundation Framework

**Type:** Framework lens over the authoritative standards. The binding
technical rules live in the `standards/` directory — this framework does
**not** restate them. It exists so the Global Looping has an explicit
engineering checkpoint confirming a product is built on the shared
foundation rather than improvising.

> Authority: `standards/*` is the source of truth. This is the checklist
> that a product's technical foundation is verified against.

## The foundation every product stands on

| Area | Authoritative standard | Core expectation |
|---|---|---|
| **API standards** | [`standards/api.md`](../standards/api.md) | REST conventions, standard error shape, pagination, validation, versioning, idempotency, documentation |
| **Database standards** | [`standards/database.md`](../standards/database.md) | Naming, timestamps, soft-delete/audit, migrations, constraints, indexes, multi-tenancy |
| **Logging** | [`standards/engineering.md`](../standards/engineering.md) | Structured logs; request IDs; no secrets/PII; leveled |
| **Monitoring** | [`standards/devops.md`](../standards/devops.md) | Health checks, error tracking, uptime + business dashboards, performance budgets |
| **Validation** | [`standards/engineering.md`](../standards/engineering.md) | Schema (zod) validation at every boundary; schema is the single source of type truth |
| **Error handling** | [`standards/engineering.md`](../standards/engineering.md) | Expected vs. unexpected errors distinguished; nothing swallowed; safe user-facing messages |
| **Scalability rules** | [`standards/database.md`](../standards/database.md), [`standards/devops.md`](../standards/devops.md) | Indexed access paths, cursor pagination, async for heavy work, stateless services, cache where it counts |

## Scalability rules (the ones most often skipped)

- **Stateless application tier** — no in-process session/state that
  prevents horizontal scaling; shared state lives in the datastore/cache.
- **Everything unbounded is paginated** — no endpoint returns an
  unbounded list; cursor pagination by default (`standards/api.md`).
- **Heavy work is async** — exports, bulk ops, AI batch jobs, scheduled
  reports run in the background, not in the request path.
- **Access paths are indexed** — every query on a growable table hits an
  index, verified against the query plan (`standards/database.md`).
- **Cache deliberately** — cache expensive, stable reads with explicit
  invalidation; never cache to paper over a missing index.

## Validation checklist (Global Looping technical gate)

- [ ] API, database, logging, validation, and error handling all conform
      to their `standards/` docs — no bespoke reinvention.
- [ ] Health checks, error tracking, and performance budgets are wired.
- [ ] Application tier is stateless; all list endpoints paginate.
- [ ] Heavy operations are async; growable-table queries are indexed.
- [ ] The product's `ARCHITECTURE.md` records any deliberate deviation
      from a standard, with justification.
