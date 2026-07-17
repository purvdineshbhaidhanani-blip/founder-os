import { nowIso } from "../../utils/id.js";
import { createLogger } from "../../utils/logger.js";
import type { EventBus } from "../events/bus.js";
import type { ApprovalSystem } from "../approval/system.js";
import { PermissionEvaluator } from "./permissions.js";
import type { ToolRegistry } from "./registry.js";
import type { ToolExecutionContext, ToolResult } from "./types.js";

const logger = createLogger("runtime.tools.executor");

export interface ToolExecutorOptions {
  registry: ToolRegistry;
  bus?: EventBus;
  approvals?: ApprovalSystem;
  askUserTimeoutMs?: number;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("aborted"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new Error("aborted"));
      },
      { once: true },
    );
  });
}

/** Merges an external caller signal with a per-attempt timeout into one signal, so tools that respect AbortSignal (fetch/child_process) can actually be cancelled. */
function combineSignals(external: AbortSignal | undefined, timeoutMs: number): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);
  const onExternalAbort = (): void => controller.abort(external?.reason ?? new Error("aborted"));
  if (external) {
    if (external.aborted) controller.abort(external.reason);
    else external.addEventListener("abort", onExternalAbort, { once: true });
  }
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      external?.removeEventListener("abort", onExternalAbort);
    },
  };
}

/**
 * Tool Executor — the single place that validates input, checks permission,
 * runs a tool with a timeout, retries on failure, and returns a structured
 * `ToolResult`. Every tool implementation only provides `run()`; everything
 * else (validation/permission/timeout/retry/logging/eventing) lives here
 * exactly once, never duplicated per tool.
 *
 * Reuses `ApprovalSystem` (via `PermissionEvaluator`) for "ask-user" and the
 * existing `EventBus` for `tool.started`/`tool.finished`/`tool.failed`/
 * `tool.retry`/`tool.cancelled` — no new eventing mechanism.
 */
export class ToolExecutor {
  private readonly registry: ToolRegistry;
  private readonly bus?: EventBus;
  private readonly permissions: PermissionEvaluator;

  constructor(options: ToolExecutorOptions) {
    this.registry = options.registry;
    this.bus = options.bus;
    this.permissions = new PermissionEvaluator({
      ...(options.approvals ? { approvals: options.approvals } : {}),
      ...(options.askUserTimeoutMs !== undefined ? { askUserTimeoutMs: options.askUserTimeoutMs } : {}),
    });
  }

  /** Exposes the backing registry read-only — lets callers (e.g. AgentExecutor's tool-calling loop) describe available tools for an LLM's `tools` field without a second registry reference. */
  get toolRegistry(): ToolRegistry {
    return this.registry;
  }

  async execute<TData = unknown>(toolId: string, rawInput: unknown, context: ToolExecutionContext): Promise<ToolResult<TData>> {
    const startedAt = nowIso();
    const tool = this.registry.get(toolId);

    if (!tool) {
      return this.finalize<TData>(toolId, startedAt, 0, {
        status: "failure",
        error: { reason: "tool-not-found", message: `No tool registered under id "${toolId}".` },
      });
    }

    const parsed = tool.inputSchema.safeParse(rawInput);
    if (!parsed.success) {
      return this.finalize<TData>(toolId, startedAt, 0, {
        status: "failure",
        error: { reason: "invalid-input", message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") },
      });
    }

    const decision = await this.permissions.evaluate(tool, context);
    if (!decision.allowed) {
      void this.bus?.publish({ name: "tool.failed", source: toolId, payload: { toolId, reason: "permission-denied", message: decision.reason } });
      return this.finalize<TData>(
        toolId,
        startedAt,
        0,
        { status: "failure", error: { reason: "permission-denied", message: decision.reason } },
        { permissionDenied: true },
      );
    }

    void this.bus?.publish({ name: "tool.started", source: toolId, payload: { toolId, task: context.task, agent: context.agent } });

    let attempts = 0;
    let lastError: { reason: string; message: string } | undefined;

    for (let attempt = 1; attempt <= tool.retryPolicy.maxAttempts; attempt += 1) {
      attempts = attempt;
      if (context.signal?.aborted) {
        void this.bus?.publish({ name: "tool.cancelled", source: toolId, payload: { toolId, attempt } });
        return this.finalize<TData>(toolId, startedAt, attempts, {
          status: "failure",
          error: { reason: "cancelled", message: "Execution was cancelled before this attempt started." },
        });
      }

      const { signal, cleanup } = combineSignals(context.signal, tool.timeoutMs);
      try {
        // Cooperative cancellation (tools that check/forward `signal`, e.g.
        // fetch/child_process) AND a hard race against that same signal —
        // the latter is what actually enforces `timeoutMs`/an external
        // abort for a tool body that never looks at the signal at all. A
        // non-cooperative tool's promise can still keep running in the
        // background after this races it out; there is no way to force-kill
        // an arbitrary in-flight Promise in JS, only stop waiting on it.
        const data = (await Promise.race([
          tool.run(parsed.data, { ...context, signal }),
          new Promise<never>((_, reject) => {
            if (signal.aborted) {
              reject(signal.reason instanceof Error ? signal.reason : new Error(String(signal.reason ?? "aborted")));
              return;
            }
            signal.addEventListener(
              "abort",
              () => reject(signal.reason instanceof Error ? signal.reason : new Error(String(signal.reason ?? "aborted"))),
              { once: true },
            );
          }),
        ])) as TData;
        cleanup();
        void this.bus?.publish({ name: "tool.finished", source: toolId, payload: { toolId, attempts } });
        logger.info("tool execution succeeded", { toolId, attempts });
        return this.finalize<TData>(toolId, startedAt, attempts, { status: "success", data });
      } catch (error) {
        cleanup();
        const aborted = signal.aborted;
        const reason = aborted && !context.signal?.aborted ? "timeout" : aborted ? "cancelled" : "execution-error";
        const message = error instanceof Error ? error.message : `unknown ${reason} error`;
        lastError = { reason, message };

        if (reason === "cancelled") {
          void this.bus?.publish({ name: "tool.cancelled", source: toolId, payload: { toolId, attempt } });
          break;
        }
        if (attempt < tool.retryPolicy.maxAttempts) {
          void this.bus?.publish({ name: "tool.retry", source: toolId, payload: { toolId, attempt, reason, message } });
          logger.warn("tool execution failed, retrying", { toolId, attempt, reason, message });
          await delay(tool.retryPolicy.baseDelayMs * 2 ** (attempt - 1), context.signal).catch(() => undefined);
        }
      }
    }

    void this.bus?.publish({ name: "tool.failed", source: toolId, payload: { toolId, attempts, ...lastError } });
    logger.error("tool execution failed", { toolId, attempts, ...lastError });
    return this.finalize<TData>(toolId, startedAt, attempts, {
      status: "failure",
      error: lastError ?? { reason: "unknown-error", message: "Tool failed with no captured error." },
    });
  }

  private finalize<TData>(
    toolId: string,
    startedAt: string,
    attempts: number,
    outcome: Pick<ToolResult<TData>, "status" | "data" | "error">,
    metadataExtra: { permissionDenied?: boolean } = {},
  ): ToolResult<TData> {
    const completedAt = nowIso();
    const durationMs = Date.parse(completedAt) - Date.parse(startedAt);
    return {
      ...outcome,
      duration: durationMs,
      metadata: {
        toolId,
        attempts,
        startedAt,
        completedAt,
        durationMs,
        ...metadataExtra,
      },
    };
  }
}
