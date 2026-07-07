import { createHmac, timingSafeEqual } from "node:crypto";

export interface WebhookVerifier {
  verify(rawBody: string, signature: string): boolean;
}

export interface HmacWebhookVerifierOptions {
  secret: string;
  algorithm?: "sha256" | "sha1";
  /** Some providers prefix the signature header, e.g. "sha256=...". Stripped before comparing if present. */
  signaturePrefix?: string;
}

/**
 * Verifies an HMAC-signed webhook payload — the pattern used by Stripe,
 * GitHub, Shopify, and most other webhook providers. Generic across all of
 * them; only the secret and algorithm differ per provider.
 */
export class HmacWebhookVerifier implements WebhookVerifier {
  constructor(private readonly options: HmacWebhookVerifierOptions) {}

  verify(rawBody: string, signature: string): boolean {
    const expected = createHmac(this.options.algorithm ?? "sha256", this.options.secret)
      .update(rawBody)
      .digest("hex");

    const actual = this.options.signaturePrefix
      ? signature.replace(this.options.signaturePrefix, "")
      : signature;

    const expectedBuffer = Buffer.from(expected, "hex");
    const actualBuffer = Buffer.from(actual, "hex");
    if (expectedBuffer.length !== actualBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, actualBuffer);
  }
}
