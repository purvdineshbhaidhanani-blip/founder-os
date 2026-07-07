export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

export interface FinishedSpan extends SpanContext {
  name: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  tags: Record<string, unknown>;
  status: "ok" | "error";
}

export interface Span {
  readonly context: SpanContext;
  setTag(key: string, value: unknown): void;
  end(status?: "ok" | "error"): void;
}

export interface Tracer {
  startSpan(name: string, parent?: SpanContext): Span;
}

let idCounter = 0;
function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now()}_${idCounter}`;
}

/** In-process tracer that records finished spans for inspection/export — no APM vendor dependency. */
export class InMemoryTracer implements Tracer {
  private readonly finished: FinishedSpan[] = [];

  startSpan(name: string, parent?: SpanContext): Span {
    const context: SpanContext = {
      traceId: parent?.traceId ?? generateId("trace"),
      spanId: generateId("span"),
      parentSpanId: parent?.spanId,
    };
    const startedAt = new Date();
    const tags: Record<string, unknown> = {};
    let ended = false;

    return {
      context,
      setTag: (key, value) => {
        tags[key] = value;
      },
      end: (status: "ok" | "error" = "ok") => {
        if (ended) return;
        ended = true;
        const endedAt = new Date();
        this.finished.push({
          ...context,
          name,
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          durationMs: endedAt.getTime() - startedAt.getTime(),
          tags,
          status,
        });
      },
    };
  }

  spans(): FinishedSpan[] {
    return [...this.finished];
  }
}
