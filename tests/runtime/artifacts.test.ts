import { describe, expect, it } from "vitest";
import { ArtifactManager } from "../../src/runtime/artifacts/index.js";

class StubStorage {
  store = new Map<string, string>();
  async write(path: string, content: string) {
    this.store.set(path, content);
  }
  async read(path: string) {
    return this.store.get(path) ?? "";
  }
  async exists(path: string) {
    return this.store.has(path);
  }
}

describe("ArtifactManager", () => {
  it("registers artifacts and writes content to storage", async () => {
    const storage = new StubStorage();
    const manager = new ArtifactManager({ storage });
    const artifact = await manager.register({
      name: "spec",
      kind: "document",
      owner: "planner",
      content: "hello",
    });
    expect(artifact.id).toMatch(/^art_/);
    expect(storage.store.get(artifact.storagePath)).toBe("hello");
  });

  it("creates parent-pointed new versions and reconstructs the chain", async () => {
    const manager = new ArtifactManager({ storage: new StubStorage() });
    const v1 = await manager.register({ name: "spec", kind: "document", owner: "a", content: "v1" });
    const v2 = await manager.newVersion(v1.id, { content: "v2" });
    const v3 = await manager.newVersion(v2.id, { content: "v3" });
    const chain = manager.chain(v3.id);
    expect(chain.map((a) => a.id)).toEqual([v1.id, v2.id, v3.id]);
    expect(v3.version).toBe("1.2.0");
  });

  it("links artifacts bidirectionally", async () => {
    const manager = new ArtifactManager({ storage: new StubStorage() });
    const a = await manager.register({ name: "a", kind: "document", owner: "x" });
    const b = await manager.register({ name: "b", kind: "document", owner: "x" });
    manager.link(a.id, b.id);
    expect(manager.get(a.id)?.relatedTo).toContain(b.id);
    expect(manager.get(b.id)?.relatedTo).toContain(a.id);
  });
});
