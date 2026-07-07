import type { AggregateHealth, HealthCheckResult, HealthStatus } from "./types.js";

export type HealthCheckFn = () => Promise<{ status: HealthStatus; details?: string }>;

const STATUS_SEVERITY: Record<HealthStatus, number> = { ok: 0, degraded: 1, down: 2 };

/** Registers named health checks (DB connectivity, downstream API, queue depth, ...) and runs them together. */
export class HealthCheckRegistry {
  private readonly checks = new Map<string, HealthCheckFn>();

  register(name: string, check: HealthCheckFn): void {
    this.checks.set(name, check);
  }

  unregister(name: string): void {
    this.checks.delete(name);
  }

  async runAll(): Promise<AggregateHealth> {
    const results = await Promise.all(
      [...this.checks.entries()].map(async ([name, check]): Promise<HealthCheckResult> => {
        const start = Date.now();
        try {
          const { status, details } = await check();
          return { name, status, details, durationMs: Date.now() - start };
        } catch (error) {
          return {
            name,
            status: "down",
            details: error instanceof Error ? error.message : String(error),
            durationMs: Date.now() - start,
          };
        }
      }),
    );

    const status = results.reduce<HealthStatus>(
      (worst, r) => (STATUS_SEVERITY[r.status] > STATUS_SEVERITY[worst] ? r.status : worst),
      "ok",
    );

    return { status, checks: results, checkedAt: new Date().toISOString() };
  }
}
