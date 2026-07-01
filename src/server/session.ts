import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("server.session");

export interface SessionPayload {
  email: string;
  issuedAt: number;
}

/**
 * Session secret resolution: prefer `SESSION_SECRET` from the environment so
 * cookies survive process restarts; fall back to a random secret generated
 * once at boot (logged as a warning — sessions won't survive a restart, and
 * this should never be relied on in a real deployment).
 */
function resolveSecret(): string {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  const generated = randomBytes(32).toString("hex");
  logger.warn(
    "SESSION_SECRET not set — generated a random secret for this process only. " +
      "Sessions will not survive a restart. Set SESSION_SECRET in production.",
  );
  return generated;
}

const SECRET = resolveSecret();

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

/**
 * Encodes `payload` as base64url JSON plus an HMAC signature, joined by a
 * dot: `<payload>.<signature>`. This string is the raw cookie value (the
 * caller is responsible for wrapping it in a `Set-Cookie` header).
 */
export function createSession(payload: SessionPayload): string {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

/**
 * Verifies the HMAC signature on a cookie value produced by `createSession`
 * and returns the decoded payload, or `null` if the value is missing,
 * malformed, or fails signature verification.
 */
export function verifySession(cookieValue: string | undefined | null): SessionPayload | null {
  if (!cookieValue) return null;
  const separatorIndex = cookieValue.lastIndexOf(".");
  if (separatorIndex === -1) return null;

  const encoded = cookieValue.slice(0, separatorIndex);
  const signature = cookieValue.slice(separatorIndex + 1);
  const expected = sign(encoded);

  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (signatureBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(signatureBuf, expectedBuf)) return null;

  try {
    const decoded = Buffer.from(encoded, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded) as SessionPayload;
    if (typeof parsed.email !== "string" || typeof parsed.issuedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

const SESSION_COOKIE_NAME = "founder_session";

export const SESSION_COOKIE = SESSION_COOKIE_NAME;

/** Parses the `Cookie` request header into a name -> value map. */
export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    out[key] = decodeURIComponent(value);
  }
  return out;
}

export function buildSessionCookieHeader(cookieValue: string): string {
  const attrs = ["HttpOnly", "Path=/", "SameSite=Lax", `Max-Age=${60 * 60 * 24 * 7}`];
  if (process.env.NODE_ENV === "production") attrs.push("Secure");
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(cookieValue)}; ${attrs.join("; ")}`;
}

export function buildClearSessionCookieHeader(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`;
}
