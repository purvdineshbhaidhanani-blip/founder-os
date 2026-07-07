import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalFsStorage } from "../src/storage/adapters/local-fs-storage.js";
import { HttpObjectStorage } from "../src/storage/adapters/http-object-storage.js";
import { DownloadManager } from "../src/storage/download-manager.js";
import { MediaProcessingPipeline } from "../src/storage/media-processing.js";
import { UploadManager } from "../src/storage/upload-manager.js";

describe("Storage Engine", () => {
  let root: string;
  let storage: LocalFsStorage;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "storage-engine-"));
    storage = new LocalFsStorage(root);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("puts, gets, lists, and deletes objects with metadata", async () => {
    await storage.put("docs/readme.txt", Buffer.from("hello world"), {
      contentType: "text/plain",
      metadata: { owner: "ada" },
    });

    expect(await storage.exists("docs/readme.txt")).toBe(true);
    const object = await storage.get("docs/readme.txt");
    expect(object.data.toString()).toBe("hello world");
    expect(object.metadata.contentType).toBe("text/plain");
    expect(object.metadata.custom).toEqual({ owner: "ada" });

    const listed = await storage.list("docs");
    expect(listed.map((f) => f.key)).toContain("docs/readme.txt");

    await storage.delete("docs/readme.txt");
    expect(await storage.exists("docs/readme.txt")).toBe(false);
  });

  it("UploadManager reports 0 then 100 percent progress", async () => {
    const uploads = new UploadManager(storage);
    const progress: number[] = [];
    await uploads.upload("file.bin", Buffer.from("data"), { onProgress: (p) => progress.push(p) });
    expect(progress).toEqual([0, 100]);
  });

  it("DownloadManager writes an object to a local file", async () => {
    await storage.put("file.bin", Buffer.from("payload"));
    const downloads = new DownloadManager(storage);
    const destPath = path.join(root, "out", "file-copy.bin");
    await downloads.downloadToFile("file.bin", destPath);
    expect((await readFile(destPath)).toString()).toBe("payload");
  });

  it("MediaProcessingPipeline runs hooks in order", async () => {
    const pipeline = new MediaProcessingPipeline()
      .use((data) => Buffer.concat([data, Buffer.from("-a")]))
      .use((data) => Buffer.concat([data, Buffer.from("-b")]));
    const result = await pipeline.run(Buffer.from("start"), { metadata: {} });
    expect(result.toString()).toBe("start-a-b");
  });

  describe("HttpObjectStorage", () => {
    it("never resolves a key containing a scheme or protocol-relative host outside baseUrl", async () => {
      const requestedUrls: string[] = [];
      const fetchImpl = vi.fn(async (url: string | URL) => {
        requestedUrls.push(url.toString());
        return new Response("ok", { status: 200 });
      });
      const storage = new HttpObjectStorage({
        baseUrl: "https://bucket.example.com/prefix",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });

      await storage.put("https://evil.example.com/x", Buffer.from("data"));
      await storage.put("//evil.example.com/x", Buffer.from("data"));

      for (const url of requestedUrls) {
        expect(new URL(url).host).toBe("bucket.example.com");
      }
    });

    it("drops path-traversal segments instead of escaping the base prefix", async () => {
      const requestedUrls: string[] = [];
      const fetchImpl = vi.fn(async (url: string | URL) => {
        requestedUrls.push(url.toString());
        return new Response("ok", { status: 200 });
      });
      const storage = new HttpObjectStorage({
        baseUrl: "https://bucket.example.com/prefix/",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });

      await storage.put("../../secret", Buffer.from("data"));
      expect(requestedUrls[0]).toBe("https://bucket.example.com/prefix/secret");
    });
  });
});
