import { randomUUID } from "node:crypto";
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getStorageClient, getStorageBucket } from "./client.js";
import { assertUploadAllowed } from "./validation.js";
import { currentAppId } from "../db/index.js";

const DOWNLOAD_URL_TTL_SECONDS = 15 * 60; // 15 minutes — short-lived signed URLs per standards/security.md

/** Every object key is scoped by app + org, mirroring the platform's multi-tenant DB scoping — no cross-tenant key guessing is even structurally possible. */
export function buildStorageKey(params: { organizationId: string; category: string; fileName: string }): string {
  const safeFileName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${currentAppId()}/${params.organizationId}/${params.category}/${randomUUID()}-${safeFileName}`;
}

export interface UploadedObject {
  storageKey: string;
  sizeBytes: number;
  mimeType: string;
}

export async function uploadObject(params: {
  organizationId: string;
  category: string;
  fileName: string;
  mimeType: string;
  body: Buffer | Uint8Array;
}): Promise<UploadedObject> {
  assertUploadAllowed({ mimeType: params.mimeType, sizeBytes: params.body.byteLength });

  const storageKey = buildStorageKey({ organizationId: params.organizationId, category: params.category, fileName: params.fileName });

  await getStorageClient().send(
    new PutObjectCommand({
      Bucket: getStorageBucket(),
      Key: storageKey,
      Body: params.body,
      ContentType: params.mimeType,
      // Never publicly readable by default — every download goes through a signed URL, per standards/security.md.
      ACL: "private",
    }),
  );

  return { storageKey, sizeBytes: params.body.byteLength, mimeType: params.mimeType };
}

export async function getSignedDownloadUrl(storageKey: string, ttlSeconds = DOWNLOAD_URL_TTL_SECONDS): Promise<string> {
  const command = new GetObjectCommand({ Bucket: getStorageBucket(), Key: storageKey });
  return getSignedUrl(getStorageClient(), command, { expiresIn: ttlSeconds });
}

export async function deleteObject(storageKey: string): Promise<void> {
  await getStorageClient().send(new DeleteObjectCommand({ Bucket: getStorageBucket(), Key: storageKey }));
}
