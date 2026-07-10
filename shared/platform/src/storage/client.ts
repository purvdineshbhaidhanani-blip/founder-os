import { S3Client } from "@aws-sdk/client-s3";
import { getPlatformEnv, isStorageConfigured } from "../config/index.js";
import { integrationNotConfiguredError } from "../errors/index.js";

let client: S3Client | undefined;

/**
 * S3-compatible object storage, built and wired per standards/security.md's
 * Phase 1 rule — works against AWS S3 or any S3-compatible provider
 * (Cloudflare R2, MinIO) via `PLATFORM_STORAGE_ENDPOINT`; fails closed
 * until credentials are supplied.
 */
export function getStorageClient(): S3Client {
  if (!isStorageConfigured()) {
    throw integrationNotConfiguredError("Object storage");
  }
  if (!client) {
    const env = getPlatformEnv();
    client = new S3Client({
      region: env.PLATFORM_STORAGE_REGION ?? "auto",
      endpoint: env.PLATFORM_STORAGE_ENDPOINT,
      credentials: {
        accessKeyId: env.PLATFORM_STORAGE_ACCESS_KEY_ID!,
        secretAccessKey: env.PLATFORM_STORAGE_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

export function getStorageBucket(): string {
  const env = getPlatformEnv();
  if (!env.PLATFORM_STORAGE_BUCKET) throw integrationNotConfiguredError("Object storage");
  return env.PLATFORM_STORAGE_BUCKET;
}
