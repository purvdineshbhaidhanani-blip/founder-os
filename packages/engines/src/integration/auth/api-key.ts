import type { AuthStrategy } from "../types.js";

export interface ApiKeyAuthOptions {
  key: string;
  /** Where to place the key. Defaults to a header. */
  location?: "header" | "query";
  /** Header or query parameter name. Defaults to "Authorization" (header) or "api_key" (query). */
  paramName?: string;
  /** Optional prefix, e.g. "Bearer " for an Authorization header. */
  prefix?: string;
}

/** Attaches a static API key to every outbound request, as a header or query parameter. */
export class ApiKeyAuthStrategy implements AuthStrategy {
  readonly type = "api-key" as const;

  constructor(private readonly options: ApiKeyAuthOptions) {}

  applyAuth(request: { headers: Record<string, string>; query: Record<string, string> }): void {
    const location = this.options.location ?? "header";
    const value = `${this.options.prefix ?? ""}${this.options.key}`;
    if (location === "header") {
      request.headers[this.options.paramName ?? "Authorization"] = value;
    } else {
      request.query[this.options.paramName ?? "api_key"] = value;
    }
  }
}
