import { describe, expect, it } from "vitest";
import { InMemoryIndexProvider, SearchEngine } from "../src/search/index.js";

describe("Search Engine", () => {
  it("indexes, filters, sorts, and full-text searches within a collection", async () => {
    const engine = new SearchEngine();
    const products = new InMemoryIndexProvider("products", { textFields: ["name", "description"] });
    engine.registerCollection(products);

    await products.indexMany([
      { id: "1", name: "Red Mug", description: "ceramic coffee mug", price: 12 },
      { id: "2", name: "Blue Mug", description: "steel travel mug", price: 20 },
      { id: "3", name: "Notebook", description: "lined paper notebook", price: 5 },
    ]);

    const textResult = await engine.search("products", { text: "mug" });
    expect(textResult.total).toBe(2);

    const filtered = await engine.search("products", { filters: [{ field: "price", op: "gte", value: 10 }] });
    expect(filtered.total).toBe(2);

    const sorted = await engine.search("products", { sort: [{ field: "price", direction: "asc" }] });
    expect(sorted.items.map((i) => i.document.id)).toEqual(["3", "1", "2"]);
  });

  it("searchAll fans out across every registered collection", async () => {
    const engine = new SearchEngine();
    const a = new InMemoryIndexProvider("a");
    const b = new InMemoryIndexProvider("b");
    engine.registerCollection(a);
    engine.registerCollection(b);
    await a.index({ id: "1", name: "apple pie" });
    await b.index({ id: "2", name: "apple tart" });

    const result = await engine.searchAll({ text: "apple" });
    expect(result.total).toBe(2);
    expect(result.collections).toHaveLength(2);
  });
});
