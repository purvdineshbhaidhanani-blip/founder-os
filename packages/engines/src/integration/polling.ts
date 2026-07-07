import { InProcessScheduler, type Scheduler } from "@platform/shared";

export interface PollingOptions<TCursor = unknown> {
  intervalMs: number;
  /** Fetches new items since `cursor`, returning the next cursor to poll from. */
  poll: (cursor: TCursor | undefined) => Promise<{ cursor: TCursor | undefined; itemsFetched: number }>;
  initialCursor?: TCursor;
  onError?: (error: unknown) => void;
  scheduler?: Scheduler;
}

/**
 * Runs a cursor-based poll loop on a fixed interval — the fallback
 * integration strategy for any API that doesn't support webhooks.
 */
export class PollingConnector<TCursor = unknown> {
  private readonly scheduler: Scheduler;
  private cursor: TCursor | undefined;
  private handleId?: string;

  constructor(private readonly options: PollingOptions<TCursor>) {
    this.scheduler = options.scheduler ?? new InProcessScheduler();
    this.cursor = options.initialCursor;
  }

  start(): void {
    if (this.handleId) return;
    const handle = this.scheduler.schedule({ type: "interval", ms: this.options.intervalMs }, async () => {
      try {
        const result = await this.options.poll(this.cursor);
        this.cursor = result.cursor;
      } catch (error) {
        this.options.onError?.(error);
      }
    });
    this.handleId = handle.id;
  }

  stop(): void {
    if (!this.handleId) return;
    this.scheduler.cancel(this.handleId);
    this.handleId = undefined;
  }

  currentCursor(): TCursor | undefined {
    return this.cursor;
  }
}
