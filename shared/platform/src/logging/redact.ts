/**
 * PII/secret redaction per standards/engineering.md: "Never log secrets,
 * tokens, passwords, or full payment details." Applied to every log line
 * before it's serialized — callers never have to remember to redact
 * manually.
 */

const SENSITIVE_KEY_PATTERN =
  /^(password|passwordHash|secret|token|apiKey|api_key|accessToken|access_token|refreshToken|refresh_token|authorization|cookie|sessionToken|session_token|tokenHash|token_hash|cardNumber|card_number|cvv|ssn|totpSecret)$/i;

const REDACTED = "[REDACTED]";

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[MAX_DEPTH]";

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }

  if (value !== null && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      output[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redact(val, depth + 1);
    }
    return output;
  }

  return value;
}
