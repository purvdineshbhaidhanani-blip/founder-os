// ---------------------------------------------------------------------------
// Parallel Executor — bounded concurrency with error isolation
// ---------------------------------------------------------------------------

export interface ExecutionResult<T> {
  index: number;
  value: T | null;
  error: string | null;
  durationMs: number;
}

export class ParallelExecutor {
  private readonly concurrency: number;

  constructor(concurrency = 4) {
    this.concurrency = Math.max(1, concurrency);
  }

  async run<T>(tasks: Array<() => Promise<T>>): Promise<ExecutionResult<T>[]> {
    const results: ExecutionResult<T>[] = new Array(tasks.length).fill(null);
    let cursor = 0;

    const worker = async (): Promise<void> => {
      while (cursor < tasks.length) {
        const idx = cursor++;
        const task = tasks[idx]!;
        const start = Date.now();
        try {
          const value = await task();
          results[idx] = { index: idx, value, error: null, durationMs: Date.now() - start };
        } catch (err) {
          results[idx] = {
            index: idx,
            value: null,
            error: err instanceof Error ? err.message : String(err),
            durationMs: Date.now() - start,
          };
        }
      }
    };

    const workers = Array.from({ length: Math.min(this.concurrency, tasks.length) }, () => worker());
    await Promise.all(workers);
    return results;
  }

  async runSettled<T>(tasks: Array<() => Promise<T>>): Promise<Array<PromiseSettledResult<T>>> {
    const results = await this.run(tasks);
    return results.map((r) =>
      r.error === null
        ? { status: "fulfilled" as const, value: r.value as T }
        : { status: "rejected" as const, reason: new Error(r.error) },
    );
  }
}
