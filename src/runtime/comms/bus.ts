import { generateId, nowIso } from "../../utils/id.js";
import { createLogger, type Logger } from "../../utils/logger.js";
import type { EventBus } from "../events/bus.js";
import type {
  CommsSubscription,
  Message,
  MessageHandler,
  MessageKind,
  RequestOptions,
} from "./types.js";

export interface CommunicationBusOptions {
  events?: EventBus;
  logger?: Logger;
  historyLimit?: number;
}

interface PendingRequest {
  resolve: (msg: Message) => void;
  reject: (err: Error) => void;
  timeout: NodeJS.Timeout;
}

const BROADCAST = "*";

/**
 * Phase 7 surface — agent-to-agent messaging. Each "send" pushes a Message
 * into every subscription that matches `to` (or every subscription for a
 * broadcast). Request/reply is built on top of direct messages by waiting on
 * a Promise keyed by message id, with optional timeout.
 */
export class CommunicationBus {
  private readonly subscriptions = new Map<string, CommsSubscription[]>();
  private readonly pending = new Map<string, PendingRequest>();
  private readonly history: Message[] = [];
  private readonly historyLimit: number;
  private readonly events?: EventBus;
  private readonly logger: Logger;

  constructor(options: CommunicationBusOptions = {}) {
    this.historyLimit = options.historyLimit ?? 5_000;
    this.events = options.events;
    this.logger = options.logger ?? createLogger("runtime.comms");
  }

  subscribe<T = unknown>(agent: string, handler: MessageHandler<T>): CommsSubscription {
    const sub: CommsSubscription = {
      id: generateId("comms-sub"),
      agent,
      handler: handler as MessageHandler,
    };
    const list = this.subscriptions.get(agent) ?? [];
    list.push(sub);
    this.subscriptions.set(agent, list);
    return sub;
  }

  unsubscribe(id: string): void {
    for (const [agent, list] of this.subscriptions) {
      const filtered = list.filter((sub) => sub.id !== id);
      if (filtered.length !== list.length) this.subscriptions.set(agent, filtered);
    }
  }

  async send<T>(input: {
    from: string;
    to: string;
    payload: T;
    kind?: MessageKind;
    correlationId?: string;
    inReplyTo?: string;
  }): Promise<Message<T>> {
    const message: Message<T> = {
      id: generateId("msg"),
      from: input.from,
      to: input.to,
      kind: input.kind ?? "direct",
      correlationId: input.correlationId,
      inReplyTo: input.inReplyTo,
      payload: input.payload,
      timestamp: nowIso(),
    };

    this.recordHistory(message as Message);

    if (message.inReplyTo) {
      const pending = this.pending.get(message.inReplyTo);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pending.delete(message.inReplyTo);
        pending.resolve(message as Message);
      }
    }

    const recipients =
      input.to === BROADCAST
        ? [...this.subscriptions.values()].flat()
        : this.subscriptions.get(input.to) ?? [];

    for (const subscription of recipients) {
      try {
        await subscription.handler(message as Message);
      } catch (error) {
        this.logger.error("subscriber threw", {
          to: input.to,
          subscriber: subscription.agent,
          error: (error as Error).message,
        });
      }
    }

    void this.events?.publish({
      name: "message.sent",
      source: input.from,
      correlationId: input.correlationId,
      payload: { id: message.id, from: input.from, to: input.to, kind: message.kind },
    });

    return message;
  }

  broadcast<T>(from: string, payload: T): Promise<Message<T>> {
    return this.send({ from, to: BROADCAST, payload, kind: "broadcast" });
  }

  /** Sends a `request` message and resolves with the matching `reply` (or rejects on timeout). */
  request<TReq, TRes = unknown>(
    from: string,
    to: string,
    payload: TReq,
    options: RequestOptions = {},
  ): Promise<Message<TRes>> {
    return new Promise<Message<TRes>>((resolve, reject) => {
      const id = generateId("msg");
      const timeoutMs = options.timeoutMs ?? 30_000;
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Request "${id}" timed out after ${timeoutMs}ms.`));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: resolve as (msg: Message) => void,
        reject,
        timeout,
      });

      const message: Message<TReq> = {
        id,
        from,
        to,
        kind: "request",
        correlationId: options.correlationId,
        payload,
        timestamp: nowIso(),
      };
      this.recordHistory(message as Message);

      const recipients = this.subscriptions.get(to) ?? [];
      Promise.all(
        recipients.map((sub) =>
          Promise.resolve(sub.handler(message as Message)).catch((err) =>
            this.logger.error("request handler threw", { error: (err as Error).message }),
          ),
        ),
      ).catch(() => {});
    });
  }

  reply<T>(originalMessageId: string, from: string, to: string, payload: T): Promise<Message<T>> {
    return this.send({ from, to, payload, kind: "reply", inReplyTo: originalMessageId });
  }

  /**
   * Sends each chunk as a `stream-chunk` message sharing the same
   * `correlationId`, followed by a final `stream-end`. Returns the stream id.
   */
  async stream<T>(from: string, to: string, chunks: Iterable<T> | AsyncIterable<T>): Promise<string> {
    const correlationId = generateId("stream");
    for await (const chunk of chunks as AsyncIterable<T>) {
      await this.send({ from, to, payload: chunk, kind: "stream-chunk", correlationId });
    }
    await this.send({ from, to, payload: { end: true }, kind: "stream-end", correlationId });
    return correlationId;
  }

  recentMessages(limit = 100): Message[] {
    return this.history.slice(-limit);
  }

  private recordHistory(message: Message): void {
    this.history.push(message);
    if (this.history.length > this.historyLimit) this.history.shift();
  }
}
