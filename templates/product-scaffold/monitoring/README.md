# Monitoring

Logging, error tracking, and health checks for this product. Full rules in
[`standards/devops.md`](../../../standards/devops.md).

## Structure

```
monitoring/
  logging.ts        # structured logger config (JSON in prod, pretty in dev)
  health.ts          # /api/health check used by the deploy platform + uptime monitor
```

## Before Phase 1 is "complete" for this product

- Structured logging is wired everywhere (no bare `console.log` in
  committed code).
- A `/api/health` route exists, checking at minimum: the process is up
  and the database is reachable.
- Error-tracking client is integrated but reads its DSN from env — with no
  DSN set, errors still log locally, they just aren't shipped anywhere.

## Phase 2

- Point error tracking and log shipping at real destinations.
- Set up uptime alerting and a business-metrics dashboard.
