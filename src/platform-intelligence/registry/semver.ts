/** Parses "major.minor.patch" into a 3-tuple, tolerant of missing parts (treated as 0). */
function parse(version: string): [number, number, number] {
  const [major = "0", minor = "0", patch = "0"] = version.split(".");
  return [Number(major) || 0, Number(minor) || 0, Number(patch) || 0];
}

/** Standard 3-way semver comparison: negative if `a` < `b`, positive if `a` > `b`, 0 if equal. */
export function compareSemVer(a: string, b: string): number {
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i]! - pb[i]!;
  }
  return 0;
}

/** True if `actual` is greater than or equal to `min` under semver ordering. */
export function satisfiesMinVersion(actual: string, min: string): boolean {
  return compareSemVer(actual, min) >= 0;
}
