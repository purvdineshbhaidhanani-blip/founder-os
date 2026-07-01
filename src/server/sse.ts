import type { ServerResponse } from "node:http";

export interface SseChannel {
  send(event: string, data: unknown): void;
  close(): void;
}

/**
 * Opens a Server-Sent Events stream on an existing HTTP response. Sets the
 * required headers and flushes them immediately so the client's
 * `EventSource` connects right away, then returns a small helper for pushing
 * further named events and closing the stream.
 */
export function openSSE(res: ServerResponse): SseChannel {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  // Some proxies/clients wait for an initial byte before treating the
  // connection as open — a comment line is a no-op per the SSE spec.
  res.write(": connected\n\n");

  let closed = false;

  return {
    send(event: string, data: unknown): void {
      if (closed || res.writableEnded) return;
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    },
    close(): void {
      if (closed) return;
      closed = true;
      if (!res.writableEnded) res.end();
    },
  };
}
