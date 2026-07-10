import { NextResponse } from "next/server";
import { toErrorResponseBody, toSuccessResponseBody } from "@founder-os/platform/api";
import { generateRequestId } from "@founder-os/platform/logging";
import { captureError } from "@founder-os/platform/monitoring";
import { PlatformError } from "@founder-os/platform/errors";

/** Next.js's internal control-flow signal for routes that call cookies()/headers() — must propagate unconverted so Next can mark the route dynamic, not be treated as a real application error. */
function isNextControlFlowError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "digest" in err && typeof (err as { digest: unknown }).digest === "string";
}

/**
 * Every route handler in this product wraps its body in this helper so
 * every response follows the standard shape (standards/api.md) without
 * hand-rolled try/catch in each route file.
 */
export async function withRouteHandler<T>(handler: () => Promise<T>): Promise<NextResponse> {
  const requestId = generateRequestId();
  try {
    const data = await handler();
    return NextResponse.json(toSuccessResponseBody(data));
  } catch (err) {
    if (isNextControlFlowError(err)) {
      throw err;
    }
    if (!(err instanceof PlatformError)) {
      captureError(err, { feature: "erpaudit.api" });
    }
    const { body, status } = toErrorResponseBody(err, requestId);
    return NextResponse.json(body, { status });
  }
}
