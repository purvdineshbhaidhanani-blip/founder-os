import { validationError } from "../errors/index.js";

/**
 * Server-side upload validation per standards/security.md: "File uploads:
 * type/size validated server-side... never executed." Client-side
 * validation is UX only — this is the actual security boundary.
 */

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "text/csv",
  "text/plain",
  "application/json",
  "image/png",
  "image/jpeg",
  "image/webp",
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel",
]);

export function assertUploadAllowed(params: { mimeType: string; sizeBytes: number; maxBytes?: number }): void {
  const maxBytes = params.maxBytes ?? DEFAULT_MAX_BYTES;

  if (!ALLOWED_MIME_TYPES.has(params.mimeType)) {
    throw validationError([{ field: "mimeType", issue: `File type "${params.mimeType}" is not allowed.` }]);
  }
  if (params.sizeBytes <= 0) {
    throw validationError([{ field: "sizeBytes", issue: "File is empty." }]);
  }
  if (params.sizeBytes > maxBytes) {
    throw validationError([{ field: "sizeBytes", issue: `File exceeds the maximum allowed size of ${maxBytes} bytes.` }]);
  }
}

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType);
}
