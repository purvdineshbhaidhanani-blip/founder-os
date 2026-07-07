import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalFsStorage } from "../src/storage/adapters/local-fs-storage.js";
import { HttpObjectStorage } from "../src/storage/adapters/http-object-storage.js";
import { DownloadManager } from "../src/storage/download-manager.js";
import { MediaProcessingPipeline } from "../src/storage/media-processing.js";
import { UploadManager } from "../src/storage/upload-manager.js";
import { isObjectStorageError } from "../src/storage/errors.js";
import { createObjectStorageHealthCheck, createObjectStorageReachabilityCheck } from "../src/storage/diagnostics.js";

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

    it("throws immediately on a missing baseUrl", () => {
      expect(() => new HttpObjectStorage({ baseUrl: "" })).toThrow(/baseUrl/);
    });

    it("does not retry by default, even on a 500 (retrying is an opt-in)", async () => {
      let calls = 0;
      const fetchImpl = vi.fn(async () => {
        calls += 1;
        return new Response("server error", { status: 500 });
      });
      const storage = new HttpObjectStorage({ baseUrl: "https://bucket.example.com", fetchImpl: fetchImpl as unknown as typeof fetch });
      await expect(storage.put("k", Buffer.from("d"))).rejects.toThrow();
      expect(calls).toBe(1);
    });

    it("retries a 500 once retryPolicy is opted into, then succeeds", async () => {
      let calls = 0;
      const fetchImpl = vi.fn(async () => {
        calls += 1;
        if (calls < 2) return new Response("server error", { status: 500 });
        return new Response("ok", { status: 200 });
      });
      const storage = new HttpObjectStorage({
        baseUrl: "https://bucket.example.com",
        fetchImpl: fetchImpl as unknown as typeof fetch,
        retryPolicy: { maxAttempts: 3, baseDelayMs: 1 },
      });
      await storage.put("k", Buffer.from("d"));
      expect(calls).toBe(2);
    });

    it("never retries a non-retryable 403, even with retryPolicy opted in", async () => {
      let calls = 0;
      const fetchImpl = vi.fn(async () => {
        calls += 1;
        return new Response("forbidden", { status: 403 });
      });
      const storage = new HttpObjectStorage({
        baseUrl: "https://bucket.example.com",
        fetchImpl: fetchImpl as unknown as typeof fetch,
        retryPolicy: { maxAttempts: 3, baseDelayMs: 1 },
      });
      await expect(storage.get("k")).rejects.toThrow();
      expect(calls).toBe(1);
    });

    it("aborts and reports a retryable timeout when a request hangs", async () => {
      const fetchImpl = vi.fn(
        (_url: unknown, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              const err = new Error("aborted");
              err.name = "AbortError";
              reject(err);
            });
          }),
      );
      const storage = new HttpObjectStorage({
        baseUrl: "https://bucket.example.com",
        fetchImpl: fetchImpl as unknown as typeof fetch,
        timeoutMs: 20,
      });
      const error = await storage.get("k").catch((e: unknown) => e);
      expect(isObjectStorageError(error)).toBe(true);
      expect((error as Error).message).toMatch(/timed out/i);
      expect((error as { retryable: boolean }).retryable).toBe(true);
    });

    it("delete() tolerates 404 without throwing", async () => {
      const fetchImpl = vi.fn(async () => new Response("not found", { status: 404 }));
      const storage = new HttpObjectStorage({ baseUrl: "https://bucket.example.com", fetchImpl: fetchImpl as unknown as typeof fetch });
      await expect(storage.delete("k")).resolves.toBeUndefined();
    });

    it("exists() returns false on a non-ok response without throwing", async () => {
      const fetchImpl = vi.fn(async () => new Response(null, { status: 404 }));
      const storage = new HttpObjectStorage({ baseUrl: "https://bucket.example.com", fetchImpl: fetchImpl as unknown as typeof fetch });
      expect(await storage.exists("k")).toBe(false);
    });
  });

  describe("storage diagnostics", () => {
    it("createObjectStorageHealthCheck reports ok after a real put/get/delete round-trip, and cleans up the probe key", async () => {
      const check = createObjectStorageHealthCheck(storage, { label: "local" });
      const result = await check();
      expect(result.status).toBe("ok");
      expect(await storage.exists(".platform-health-check/probe")).toBe(false);
    });

    it("createObjectStorageHealthCheck reports down when put fails, without ever calling get", async () => {
      const getSpy = vi.spyOn(storage, "get");
      vi.spyOn(storage, "put").mockRejectedValue(new Error("disk full"));

      const check = createObjectStorageHealthCheck(storage);
      const result = await check();

      expect(result.status).toBe("down");
      expect(result.details).toContain("disk full");
      expect(getSpy).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });

    it("createObjectStorageReachabilityCheck reports ok on a reachable endpoint and down on a 5xx", async () => {
      const ok = createObjectStorageReachabilityCheck({
        baseUrl: "https://bucket.example.com",
        fetchImpl: (async () => new Response(null, { status: 404 })) as unknown as typeof fetch,
      });
      expect((await ok()).status).toBe("ok");

      const down = createObjectStorageReachabilityCheck({
        baseUrl: "https://bucket.example.com",
        fetchImpl: (async () => new Response(null, { status: 503 })) as unknown as typeof fetch,
      });
      expect((await down()).status).toBe("down");
    });
  });
});
