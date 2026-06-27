import { nowIso } from "../../utils/id.js";
import type { EventBus } from "../events/bus.js";
import type { ExecutionOptions, ExecutionResult, ExecutionUnit } from "./types.js";

interface BarrierEntry {
  needed: number;
  arrived: number;
  resolve: () => void;
  promise: Promise<void>;
}

/**
 * Phase 9 surface — runs `ExecutionUnit`s in three modes (sequential,
 * parallel-with-concurrency-limit, dependency-aware). Also exposes a token
 * bucket throttle and a named barrier for synchronizing parallel actors.
 */
export class ExecutionEngine {
  private readonly barriers = new Map<string, BarrierEntry>();
  private readonly bus?: EventBus;

  constructor(options: { bus?: EventBus } = {}) {
    this.bus = options.bus;
  }

  async runSequential<TIn, TOut>(
    units: ExecutionUnit<TIn, TOut>[],
    options: ExecutionOptions = {},
  ): Promise<ExecutionResult<TOut>[]> {
    const results: ExecutionResult<TOut>[] = [];
    for (const unit of units) {
      const result = await this.runOne(unit);
      results.push(result);
      if (!result.ok && options.stopOnFailure) break;
    }
    return results;
  }

  async runParallel<TIn, TOut>(
    units: ExecutionUnit<TIn, TOut>[],
    options: ExecutionOptions = {},
  ): Promise<ExecutionResult<TOut>[]> {
    const concurrency = options.concurrency ?? Infinity;
    const results: ExecutionResult<TOut>[] = new Array(units.length);
    let nextIndex = 0;
    let stop = false;

    const worker = async (): Promise<void> => {
      while (true) {
        if (stop) return;
        const current = nextIndex;
        nextIndex += 1;
        if (current >= units.length) return;
        const unit = units[current]!;
        const result = await this.runOne(unit);
        results[current] = result;
        if (!result.ok && options.stopOnFailure) stop = true;
      }
    };

    const workerCount = Math.max(1, Math.min(concurrency, units.length));
    await Promise.all(Array.from({ length: workerCount }, () => worker()));
    return results.filter((r): r is ExecutionResult<TOut> => Boolean(r));
  }

  /**
   * Runs units in dependency order: any unit whose dependsOn list is empty
   * (or whose listed deps are all already `succeeded` in `results`) becomes
   * eligible. Eligible units run in parallel up to `concurrency`.
   */
  async runDependencyAware<TIn, TOut>(
    units: ExecutionUnit<TIn, TOut>[],
    options: ExecutionOptions = {},
  ): Promise<ExecutionResult<TOut>[]> {
    const remaining = new Map(units.map((unit) => [unit.id, unit]));
    const results = new Map<string, ExecutionResult<TOut>>();
    const concurrency = options.concurrency ?? Infinity;
    let stop = false;

    while (remaining.size > 0 && !stop) {
      const ready: ExecutionUnit<TIn, TOut>[] = [];
      for (const unit of remaining.values()) {
        const deps = unit.dependsOn ?? [];
        if (deps.every((depId) => results.get(depId)?.ok)) ready.push(unit);
      }
      if (ready.length === 0) {
        const blocked = [...remaining.keys()];
        throw new Error(
          `Dependency-aware execution stuck: no ready units. Remaining: ${blocked.join(", ")}.`,
        );
      }

      const batch = ready.slice(0, Math.max(1, Math.min(concurrency, ready.length)));
      const batchResults = await Promise.all(batch.map((unit) => this.runOne(unit)));
      for (const result of batchResults) {
        results.set(result.id, result);
        remaining.delete(result.id);
        if (!result.ok && options.stopOnFailure) stop = true;
      }
    }
    return [...results.values()];
  }

  /**
   * Calls `fn` honoring a "no more than `rate` calls per `intervalMs`" budget.
   * The throttle is shared per-engine — useful for outbound API rate limits.
   */
  throttle<T>(key: string, rate: number, intervalMs: number, fn: () => Promise<T>): Promise<T> {
    const bucket = this.bucket(key, rate, intervalMs);
    return bucket.run(fn);
  }

  /** Blocks until `needed` callers have hit the barrier. Then releases them all. */
  synchronize(barrier: string, needed: number): Promise<void> {
    let entry = this.barriers.get(barrier);
    if (!entry || entry.needed !== needed) {
      let resolve!: () => void;
      const promise = new Promise<void>((r) => {
        resolve = r;
      });
      entry = { needed, arrived: 0, resolve, promise };
      this.barriers.set(barrier, entry);
    }
    entry.arrived += 1;
    if (entry.arrived >= entry.needed) {
      entry.resolve();
      this.barriers.delete(barrier);
    }
    return entry.promise;
  }

  private async runOne<TIn, TOut>(unit: ExecutionUnit<TIn, TOut>): Promise<ExecutionResult<TOut>> {
    const startedAt = nowIso();
    const startMs = Date.now();
    void this.bus?.publish({ name: "execution.started", payload: { id: unit.id } });
    try {
      const output = await unit.run(unit.input);
      const completedAt = nowIso();
      const result: ExecutionResult<TOut> = {
        id: unit.id,
        ok: true,
        output,
        startedAt,
        completedAt,
        durationMs: Date.now() - startMs,
      };
      void this.bus?.publish({
        name: "execution.completed",
        payload: { id: unit.id, ok: true, durationMs: result.durationMs },
      });
      return result;
    } catch (error) {
      const completedAt = nowIso();
      const result: ExecutionResult<TOut> = {
        id: unit.id,
        ok: false,
        error: { message: (error as Error).message },
        startedAt,
        completedAt,
        durationMs: Date.now() - startMs,
      };
      void this.bus?.publish({
        name: "execution.completed",
        payload: { id: unit.id, ok: false, durationMs: result.durationMs },
      });
      return result;
    }
  }

  private readonly buckets = new Map<string, TokenBucket>();
  private bucket(key: string, rate: number, intervalMs: number): TokenBucket {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = new TokenBucket(rate, intervalMs);
      this.buckets.set(key, bucket);
    }
    return bucket;
  }
}

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  constructor(
    private readonly rate: number,
    private readonly intervalMs: number,
  ) {
    this.tokens = rate;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const elapsed = Date.now() - this.lastRefill;
    const refill = Math.floor((elapsed / this.intervalMs) * this.rate);
    if (refill > 0) {
      this.tokens = Math.min(this.rate, this.tokens + refill);
      this.lastRefill = Date.now();
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    while (true) {
      this.refill();
      if (this.tokens > 0) {
        this.tokens -= 1;
        return fn();
      }
      const wait = Math.max(10, this.intervalMs / this.rate);
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
}
