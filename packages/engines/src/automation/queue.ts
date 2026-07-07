export interface QueueJob<TPayload = unknown> {
  id: string;
  payload: TPayload;
  enqueuedAt: string;
  attempts: number;
}

export type JobHandler<TPayload = unknown> = (job: QueueJob<TPayload>) => Promise<void> | void;

export interface Queue<TPayload = unknown> {
  enqueue(payload: TPayload): Promise<QueueJob<TPayload>>;
  process(handler: JobHandler<TPayload>): void;
  size(): number;
}

export interface InMemoryQueueOptions {
  concurrency?: number;
  maxAttempts?: number;
  onError?: (error: unknown, job: QueueJob<unknown>) => void;
}

let jobCounter = 0;
function generateJobId(): string {
  jobCounter += 1;
  return `job_${Date.now()}_${jobCounter}`;
}

/**
 * In-process FIFO queue with bounded concurrency and simple retry-on-throw.
 * Implements the `Queue` interface so a Redis/SQS/etc.-backed queue can be
 * substituted without changing anything that calls `enqueue`/`process`.
 */
export class InMemoryQueue<TPayload = unknown> implements Queue<TPayload> {
  private readonly pending: QueueJob<TPayload>[] = [];
  private handler?: JobHandler<TPayload>;
  private active = 0;
  private readonly concurrency: number;
  private readonly maxAttempts: number;
  private readonly onError?: (error: unknown, job: QueueJob<unknown>) => void;

  constructor(options: InMemoryQueueOptions = {}) {
    this.concurrency = options.concurrency ?? 1;
    this.maxAttempts = options.maxAttempts ?? 1;
    if (this.concurrency < 1) throw new Error("InMemoryQueue: concurrency must be at least 1 (0 would never drain the queue).");
    if (this.maxAttempts < 1) throw new Error("InMemoryQueue: maxAttempts must be at least 1.");
    this.onError = options.onError;
  }

  async enqueue(payload: TPayload): Promise<QueueJob<TPayload>> {
    const job: QueueJob<TPayload> = {
      id: generateJobId(),
      payload,
      enqueuedAt: new Date().toISOString(),
      attempts: 0,
    };
    this.pending.push(job);
    this.drain();
    return job;
  }

  process(handler: JobHandler<TPayload>): void {
    this.handler = handler;
    this.drain();
  }

  size(): number {
    return this.pending.length;
  }

  private drain(): void {
    if (!this.handler) return;
    while (this.active < this.concurrency && this.pending.length > 0) {
      const job = this.pending.shift()!;
      this.active += 1;
      void this.runJob(job);
    }
  }

  private async runJob(job: QueueJob<TPayload>): Promise<void> {
    job.attempts += 1;
    try {
      await this.handler!(job);
    } catch (error) {
      if (job.attempts < this.maxAttempts) {
        this.pending.push(job);
      } else {
        // Guard against a caller-supplied onError itself throwing — this queue must
        // never reject runJob's promise, since drain() invokes it as `void this.runJob(job)`.
        try {
          this.onError?.(error, job as QueueJob<unknown>);
        } catch {
          // intentionally swallowed — see comment above
        }
      }
    } finally {
      this.active -= 1;
      this.drain();
    }
  }
}
