import { ApiError } from "../api/client";

/**
 * Single source of truth for turning any thrown value into a friendly,
 * user-facing message. Consolidates the `err instanceof Error ? err.message`
 * pattern that was duplicated across pages/components, and gives ApiError
 * (including the client's synthetic timeout/network errors) a clean message.
 */
export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof ApiError) return err.body.error || err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}
