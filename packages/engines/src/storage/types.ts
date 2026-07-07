export interface FileMetadata {
  key: string;
  size: number;
  contentType?: string;
  etag?: string;
  lastModified?: string;
  custom?: Record<string, string>;
}

export interface StoredObject {
  data: Buffer;
  metadata: FileMetadata;
}

export interface PutOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export type ProgressCallback = (percent: number) => void;
