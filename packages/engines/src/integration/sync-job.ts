import { NO_RETRY_POLICY, withRetry, type RetryPolicy } from "@platform/shared";
import type { SyncJobResult } from "./types.js";

export interface SyncJobOptions {
  connectorId: string;
  cursor?: string;
  /** Defaults to a single attempt (no retry) — pass a policy explicitly once the sync function is confirmed safe to re-run from the same cursor. */
  retry?: RetryPolicy;
}

export type SyncFn = (cursor: string | undefined) => Promise<{ itemsSynced: number; cursor?: string }>;

/** Runs a one-shot sync job (full or incremental) with retry, recording a structured result either way. */
export class SyncJobRunner {
  async run(sync: SyncFn, options: SyncJobOptions): Promise<SyncJobResult> {
    const startedAt = new Date().toISOString();
    try {
      const { itemsSynced, cursor } = await withRetry(() => sync(options.cursor), options.retry ?? NO_RETRY_POLICY);
      return {
        connectorId: options.connectorId,
        startedAt,
        completedAt: new Date().toISOString(),
        status: "succeeded",
        itemsSynced,
        cursor,
      };
    } catch (error) {
      return {
        connectorId: options.connectorId,
        startedAt,
        completedAt: new Date().toISOString(),
        status: "failed",
        itemsSynced: 0,
        error: error instanceof Error ? error.message : String(error),
        cursor: options.cursor,
      };
    }
  }
}
