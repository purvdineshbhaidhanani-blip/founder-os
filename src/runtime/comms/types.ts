import type { Timestamp } from "../../types/common.js";

export type MessageKind = "direct" | "broadcast" | "request" | "reply" | "stream-chunk" | "stream-end";

export interface Message<T = unknown> {
  id: string;
  from: string;
  /** Recipient agent name or "*" for broadcasts. */
  to: string;
  kind: MessageKind;
  /** Groups related messages (e.g. all chunks of one streamed payload). */
  correlationId?: string;
  /** For replies: id of the original request. */
  inReplyTo?: string;
  payload: T;
  timestamp: Timestamp;
}

export type MessageHandler<T = unknown> = (message: Message<T>) => void | Promise<void>;

export interface CommsSubscription {
  id: string;
  agent: string;
  handler: MessageHandler;
}

export interface RequestOptions {
  timeoutMs?: number;
  correlationId?: string;
}
