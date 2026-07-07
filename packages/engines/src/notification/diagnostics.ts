import net from "node:net";
import tls from "node:tls";
import { createHttpReachabilityCheck } from "@platform/shared";

/** Structurally compatible with the Logging & Monitoring engine's `HealthCheckFn` — see ai/diagnostics.ts for why this isn't imported. */
export type ProviderHealthStatus = "ok" | "degraded" | "down";
export interface ProviderHealthResult {
  status: ProviderHealthStatus;
  details?: string;
}

const DEFAULT_TIMEOUT_MS = 10_000;

export interface HttpEmailHealthCheckOptions {
  endpoint: string;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /** Label included in details, e.g. "resend". Defaults to "http-email". */
  label?: string;
}

/**
 * Connectivity-only check for an HTTP-based email provider (Resend,
 * SendGrid, Postmark, ...) — it does NOT send a test email, since that
 * would have a real, visible side effect every time the check runs.
 * Verifies the endpoint's host is reachable and answering; a real send is
 * still only proven by actually sending through the channel. Thin wrapper
 * over `@platform/shared`'s generic `createHttpReachabilityCheck`.
 */
export function createHttpEmailHealthCheck(options: HttpEmailHealthCheckOptions): () => Promise<ProviderHealthResult> {
  return createHttpReachabilityCheck({
    url: options.endpoint,
    headers: options.headers,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    label: options.label ?? "http-email",
  });
}

export interface SmtpHealthCheckOptions {
  host: string;
  /** Defaults to 587 (STARTTLS submission). */
  port?: number;
  /** Connect with implicit TLS from the first byte (port 465 convention). Defaults to `port === 465`. */
  secure?: boolean;
  /** Upgrade via STARTTLS after the greeting. Defaults to `true` unless `secure` is set. */
  startTls?: boolean;
  /** Hostname sent in EHLO. Defaults to "platform-health-check". */
  clientName?: string;
  timeoutMs?: number;
}

/**
 * Connectivity-only probe: opens a socket, reads the SMTP greeting, sends
 * EHLO, and (unless `secure`/`startTls: false`) negotiates STARTTLS — then
 * disconnects. This confirms the host/port are reachable and something
 * SMTP-shaped answers; it does NOT authenticate or send mail.
 *
 * Full message submission (AUTH negotiation, MAIL FROM/RCPT TO/DATA,
 * dot-stuffing per RFC 5321) is real wire-protocol work that needs a live
 * server to test against safely — it is intentionally not implemented here.
 * See docs/PROVIDER_SETUP.md for what that would take.
 */
export function createSmtpHealthCheck(options: SmtpHealthCheckOptions): () => Promise<ProviderHealthResult> {
  const port = options.port ?? 587;
  const secure = options.secure ?? port === 465;
  const startTls = options.startTls ?? !secure;
  const clientName = options.clientName ?? "platform-health-check";
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return async () => {
    if (!options.host) return { status: "down", details: "smtp: no host configured." };
    try {
      const details = await probeSmtp(options.host, port, secure, startTls, clientName, timeoutMs);
      return { status: "ok", details };
    } catch (error) {
      return { status: "down", details: `smtp: ${error instanceof Error ? error.message : String(error)}` };
    }
  };
}

function isFinalResponseLine(line: string): boolean {
  return /^\d{3}(?: |$)/.test(line);
}

type Stage = "greeting" | "ehlo" | "starttls";

function probeSmtp(
  host: string,
  port: number,
  secure: boolean,
  startTls: boolean,
  clientName: string,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let socket: net.Socket | tls.TLSSocket = secure ? tls.connect({ host, port }) : net.connect({ host, port });
    let buffer = "";
    let stage: Stage = "greeting";
    let settled = false;

    const timer = setTimeout(() => finish(new Error(`timed out after ${timeoutMs}ms waiting for SMTP stage "${stage}"`)), timeoutMs);

    function finish(error?: Error, result?: string): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.removeAllListeners();
      socket.destroy();
      if (error) reject(error);
      else resolve(result ?? "smtp: greeting + EHLO succeeded.");
    }

    function send(line: string): void {
      socket.write(`${line}\r\n`);
    }

    function handleLine(line: string): void {
      const code = line.slice(0, 3);
      if (stage === "greeting") {
        if (code !== "220") return finish(new Error(`unexpected greeting: ${line}`));
        stage = "ehlo";
        send(`EHLO ${clientName}`);
        return;
      }
      if (stage === "ehlo") {
        if (code !== "250") return finish(new Error(`EHLO rejected: ${line}`));
        if (!startTls) {
          send("QUIT");
          return finish(undefined, "smtp: greeting + EHLO succeeded.");
        }
        stage = "starttls";
        send("STARTTLS");
        return;
      }
      if (stage === "starttls") {
        if (code !== "220") return finish(new Error(`STARTTLS rejected: ${line}`));
        const plainSocket = socket as net.Socket;
        const tlsSocket = tls.connect({ socket: plainSocket, host });
        socket = tlsSocket;
        tlsSocket.on("error", (err) => finish(err instanceof Error ? err : new Error(String(err))));
        tlsSocket.on("secureConnect", () => finish(undefined, "smtp: greeting + EHLO + STARTTLS succeeded."));
      }
    }

    socket.on("error", (err) => finish(err instanceof Error ? err : new Error(String(err))));
    socket.on("data", (chunk: Buffer) => {
      buffer += chunk.toString("utf-8");
      while (true) {
        const idx = buffer.indexOf("\r\n");
        if (idx === -1) break;
        const line = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (!line) continue;
        if (!isFinalResponseLine(line)) continue; // multi-line response ("250-...") — keep reading
        handleLine(line);
        break;
      }
    });
  });
}
