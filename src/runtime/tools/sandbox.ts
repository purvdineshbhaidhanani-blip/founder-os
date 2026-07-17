import path from "node:path";

/**
 * Workspace sandboxing — the single choke point every filesystem/shell/git
 * tool routes through before touching disk. Prevents path traversal
 * (`../../etc/passwd`, absolute paths outside the root, symlink-shaped
 * tricks via `..` segments) by resolving the candidate path and verifying it
 * stays under `root`.
 *
 * This is NOT a full OS-level jail (no chroot/container) — it is a
 * string/path-boundary check, same class of guard as the SSRF hostname
 * blocklist in `src/monitoring/providers/web-snapshot.ts`. Documented here
 * as exactly that: a real, meaningful guard, not a claim of total isolation.
 */
export class SandboxViolationError extends Error {
  constructor(
    public readonly requestedPath: string,
    public readonly root: string,
  ) {
    super(`Path "${requestedPath}" escapes the sandboxed workspace root "${root}".`);
    this.name = "SandboxViolationError";
  }
}

/**
 * Resolves `candidate` (absolute or relative to `root`) and throws
 * `SandboxViolationError` if the result is not `root` itself or a descendant
 * of it. Returns the resolved absolute path on success.
 */
export function resolveSandboxedPath(root: string, candidate: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.isAbsolute(candidate) ? path.resolve(candidate) : path.resolve(resolvedRoot, candidate);

  const relative = path.relative(resolvedRoot, resolvedCandidate);
  const escapes = relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
  if (escapes) throw new SandboxViolationError(candidate, resolvedRoot);

  return resolvedCandidate;
}

/** Non-throwing check — true when `candidate` resolves inside `root`. */
export function isPathSandboxed(root: string, candidate: string): boolean {
  try {
    resolveSandboxedPath(root, candidate);
    return true;
  } catch {
    return false;
  }
}
