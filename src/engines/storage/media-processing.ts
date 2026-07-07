import type { FileMetadata } from "./types.js";

export interface MediaProcessingContext {
  metadata: Partial<FileMetadata>;
}

/**
 * A single processing step (resize, transcode, virus scan, thumbnail
 * generation, ...). Deliberately just a function contract — concrete image
 * or video processing libraries plug in here without this engine ever
 * depending on one.
 */
export type MediaProcessingHook = (
  data: Buffer,
  context: MediaProcessingContext,
) => Promise<Buffer> | Buffer;

/** Runs a sequence of hooks over a buffer, each seeing the previous hook's output. */
export class MediaProcessingPipeline {
  private readonly hooks: MediaProcessingHook[] = [];

  use(hook: MediaProcessingHook): this {
    this.hooks.push(hook);
    return this;
  }

  async run(data: Buffer, context: MediaProcessingContext): Promise<Buffer> {
    let current = data;
    for (const hook of this.hooks) {
      current = await hook(current, context);
    }
    return current;
  }
}

/** No-op hook — useful as a placeholder or for pipelines assembled conditionally. */
export const passthroughHook: MediaProcessingHook = (data) => data;
