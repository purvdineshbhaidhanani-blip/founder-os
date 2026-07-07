export interface InterpolateOptions {
  /** Throw if a placeholder has no matching variable. Defaults to true. */
  strict?: boolean;
}

const PLACEHOLDER_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

function getPath(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, source);
}

/**
 * Renders `{{variable}}` / `{{nested.path}}` placeholders against a variable
 * bag. Shared by the AI Engine's prompt manager and the Notification
 * Engine's template renderer so there is exactly one interpolation syntax
 * across the platform.
 */
export function interpolate(
  template: string,
  variables: Record<string, unknown>,
  options: InterpolateOptions = {},
  onMissing?: (path: string) => void,
): string {
  const strict = options.strict ?? true;
  return template.replace(PLACEHOLDER_PATTERN, (match, path: string) => {
    const value = getPath(variables, path);
    if (value === undefined || value === null) {
      onMissing?.(path);
      if (strict) throw new Error(`Missing template variable "${path}".`);
      return match;
    }
    return String(value);
  });
}
