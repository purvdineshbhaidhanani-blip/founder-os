import type { ObjectStorageProvider } from "../object-storage.js";
import type { FileMetadata, PutOptions, StoredObject } from "../types.js";

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
}

/**
 * Talks to any REST-based object store (S3-compatible, GCS XML API, Azure
 * Blob, a custom internal service) over plain `fetch`. Auth is delegated to
 * `signRequest` so this class never encodes a specific provider's signing
 * scheme.
 */
export class HttpObjectStorage implements ObjectStorageProvider {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: HttpObjectStorageOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private urlFor(key: string): string {
    return new URL(key, this.options.baseUrl.endsWith("/") ? this.options.baseUrl : `${this.options.baseUrl}/`).toString();
  }

  private async signedHeaders(method: string, url: string, headers: Record<string, string>): Promise<Record<string, string>> {
    await this.options.signRequest?.({ method, url, headers });
    return headers;
  }

  async put(key: string, data: Buffer, options: PutOptions = {}): Promise<FileMetadata> {
    const url = this.urlFor(key);
    const headers: Record<string, string> = { "content-type": options.contentType ?? "application/octet-stream" };
    for (const [k, v] of Object.entries(options.metadata ?? {})) headers[`x-amz-meta-${k}`] = v;
    await this.signedHeaders("PUT", url, headers);

    const response = await this.fetchImpl(url, { method: "PUT", headers, body: data });
    if (!response.ok) throw new Error(`Object PUT failed (${response.status}): ${await response.text()}`);
    return { key, size: data.length, contentType: options.contentType, custom: options.metadata };
  }

  async get(key: string): Promise<StoredObject> {
    const url = this.urlFor(key);
    const headers = await this.signedHeaders("GET", url, {});
    const response = await this.fetchImpl(url, { method: "GET", headers });
    if (!response.ok) throw new Error(`Object GET failed (${response.status}): ${await response.text()}`);
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
  }

  async exists(key: string): Promise<boolean> {
    const url = this.urlFor(key);
    const headers = await this.signedHeaders("HEAD", url, {});
    const response = await this.fetchImpl(url, { method: "HEAD", headers });
    return response.ok;
  }

  async delete(key: string): Promise<void> {
    const url = this.urlFor(key);
    const headers = await this.signedHeaders("DELETE", url, {});
    const response = await this.fetchImpl(url, { method: "DELETE", headers });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Object DELETE failed (${response.status}): ${await response.text()}`);
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
