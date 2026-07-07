import { NO_RETRY_POLICY, withRetry, withTimeoutSignal, type RetryPolicy } from "@platform/shared";
import { createObjectStorageError, isObjectStorageError } from "../errors.js";
import type { ObjectStorageProvider } from "../object-storage.js";
import type { FileMetadata, PutOptions, StoredObject } from "../types.js";

/** Object storage tends to move larger payloads than a typical REST call. Set 0 to disable. */
const DEFAULT_TIMEOUT_MS = 30_000;

export interface HttpObjectStorageOptions {
  /** Base URL for the bucket/container, e.g. "https://bucket.s3.amazonaws.com". */
  baseUrl: string;
  /**
   * Signs/authenticates an outbound request (SigV4, a bearer token, a
   * presigned-URL scheme, whatever the backend needs). Keeping this
   * injectable is what makes the adapter work with any S3-compatible or
   * REST-based object store without a vendor SDK dependency.
   */
  signRequest?: (request: { method: string; url: string; headers: Record<string, string> }) => Promise<void> | void;
  fetchImpl?: typeof fetch;
  /** Tag included in error messages/diagnostics, e.g. "s3", "r2", "gcs". Defaults to "http-object-storage". */
  providerId?: string;
  /** Aborts a request that runs longer than this. 0 disables the timeout. Defaults to 30s. */
  timeoutMs?: number;
  /**
   * Every method here is a keyed, idempotent overwrite/read/delete, so
   * retrying is safe — but still opt-in: defaults to `NO_RETRY_POLICY` (no
   * retry), matching the codebase-wide rule that retrying is a caller
   * choice, not a side effect of not choosing (see `NO_RETRY_POLICY` in
   * `@platform/shared`).
   */
  retryPolicy?: RetryPolicy;
}

/**
 * Talks to any REST-based object store (S3-compatible, GCS XML API, Azure
 * Blob, a custom internal service) over plain `fetch`. Auth is delegated to
 * `signRequest` so this class never encodes a specific provider's signing
 * scheme.
 */
export class HttpObjectStorage implements ObjectStorageProvider {
  private readonly fetchImpl: typeof fetch;
  private readonly providerId: string;
  private readonly timeoutMs: number;
  private readonly retryPolicy: RetryPolicy;

  constructor(private readonly options: HttpObjectStorageOptions) {
    if (!options.baseUrl) throw new Error("HttpObjectStorage requires a baseUrl.");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.providerId = options.providerId ?? "http-object-storage";
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.retryPolicy = options.retryPolicy ?? NO_RETRY_POLICY;
  }

  /**
   * Builds the object URL by concatenating percent-encoded path segments
   * onto `baseUrl` — deliberately not `new URL(key, baseUrl)`. A `key`
   * containing a scheme (`"https://evil.example/x"`) or a protocol-relative
   * prefix (`"//evil.example/x"`) would otherwise be resolved by the WHATWG
   * URL parser as its own absolute URL, silently discarding `baseUrl` and
   * sending the request (with auth headers) to an attacker-controlled host.
   * `.`/`..`/empty segments are dropped too, closing the matching
   * path-traversal case.
   */
  private urlFor(key: string): string {
    const base = this.options.baseUrl.endsWith("/") ? this.options.baseUrl : `${this.options.baseUrl}/`;
    const safeKey = key
      .split("/")
      .filter((segment) => segment !== "" && segment !== "." && segment !== "..")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    return `${base}${safeKey}`;
  }

  private async signedHeaders(method: string, url: string, headers: Record<string, string>): Promise<Record<string, string>> {
    await this.options.signRequest?.({ method, url, headers });
    return headers;
  }

  private effectiveRetryPolicy(): RetryPolicy {
    return {
      ...this.retryPolicy,
      shouldRetry: (error, attempt) => {
        if (this.retryPolicy.shouldRetry) return this.retryPolicy.shouldRetry(error, attempt);
        return isObjectStorageError(error) && error.retryable;
      },
    };
  }

  /** Normalizes a timeout into a typed, retryable `ObjectStorageError`; anything already typed passes through. */
  private normalizeError(error: unknown, method: string): unknown {
    if (isObjectStorageError(error)) return error;
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      return createObjectStorageError(this.providerId, `Object ${method} timed out after ${this.timeoutMs}ms.`, {
        retryable: true,
        cause: error,
      });
    }
    return error;
  }

  async put(key: string, data: Buffer, options: PutOptions = {}): Promise<FileMetadata> {
    return withRetry(() => this.doPut(key, data, options), this.effectiveRetryPolicy());
  }

  private async doPut(key: string, data: Buffer, options: PutOptions): Promise<FileMetadata> {
    const url = this.urlFor(key);
    const headers: Record<string, string> = { "content-type": options.contentType ?? "application/octet-stream" };
    for (const [k, v] of Object.entries(options.metadata ?? {})) headers[`x-amz-meta-${k}`] = v;
    await this.signedHeaders("PUT", url, headers);

    const { signal, cancel } = withTimeoutSignal(this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, { method: "PUT", headers, body: data, signal });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw createObjectStorageError(this.providerId, `Object PUT failed (${response.status}): ${text}`, {
          statusCode: response.status,
          retryable: response.status === 429 || response.status >= 500,
        });
      }
      return { key, size: data.length, contentType: options.contentType, custom: options.metadata };
    } catch (error) {
      throw this.normalizeError(error, "PUT");
    } finally {
      cancel();
    }
  }

  async get(key: string): Promise<StoredObject> {
    return withRetry(() => this.doGet(key), this.effectiveRetryPolicy());
  }

  private async doGet(key: string): Promise<StoredObject> {
    const url = this.urlFor(key);
    const headers = await this.signedHeaders("GET", url, {});
    const { signal, cancel } = withTimeoutSignal(this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, { method: "GET", headers, signal });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw createObjectStorageError(this.providerId, `Object GET failed (${response.status}): ${text}`, {
          statusCode: response.status,
          retryable: response.status === 429 || response.status >= 500,
        });
      }
      const data = Buffer.from(await response.arrayBuffer());
      return {
        data,
        metadata: {
          key,
          size: data.length,
          contentType: response.headers.get("content-type") ?? undefined,
          etag: response.headers.get("etag") ?? undefined,
          lastModified: response.headers.get("last-modified") ?? undefined,
        },
      };
    } catch (error) {
      throw this.normalizeError(error, "GET");
    } finally {
      cancel();
    }
  }

  async exists(key: string): Promise<boolean> {
    return withRetry(() => this.doExists(key), this.effectiveRetryPolicy());
  }

  private async doExists(key: string): Promise<boolean> {
    const url = this.urlFor(key);
    const headers = await this.signedHeaders("HEAD", url, {});
    const { signal, cancel } = withTimeoutSignal(this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, { method: "HEAD", headers, signal });
      return response.ok;
    } catch (error) {
      throw this.normalizeError(error, "HEAD");
    } finally {
      cancel();
    }
  }

  async delete(key: string): Promise<void> {
    return withRetry(() => this.doDelete(key), this.effectiveRetryPolicy());
  }

  private async doDelete(key: string): Promise<void> {
    const url = this.urlFor(key);
    const headers = await this.signedHeaders("DELETE", url, {});
    const { signal, cancel } = withTimeoutSignal(this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, { method: "DELETE", headers, signal });
      if (!response.ok && response.status !== 404) {
        const text = await response.text().catch(() => "");
        throw createObjectStorageError(this.providerId, `Object DELETE failed (${response.status}): ${text}`, {
          statusCode: response.status,
          retryable: response.status === 429 || response.status >= 500,
        });
      }
    } catch (error) {
      throw this.normalizeError(error, "DELETE");
    } finally {
      cancel();
    }
  }

  async list(): Promise<FileMetadata[]> {
    throw new Error(
      "HttpObjectStorage.list() is provider-specific (bucket listing APIs vary); implement it for your backend or use LocalFsStorage in development.",
    );
  }

  async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    const url = new URL(this.urlFor(key));
    url.searchParams.set("expires_in", String(expiresInSeconds));
    await this.signedHeaders("GET", url.toString(), {});
    return url.toString();
  }
}
