import { describe, expect, it } from "vitest";
import { formatCitationList } from "../src/knowledge/citation.js";
import { chunkDocument } from "../src/knowledge/chunking.js";
import { HashEmbeddingProvider } from "../src/knowledge/embeddings.js";
import { KnowledgeRetriever } from "../src/knowledge/retrieval.js";

describe("Knowledge Engine", () => {
  it("chunks a document into overlapping windows", () => {
    const doc = { id: "d1", title: "Doc", content: "a".repeat(2500) };
    const chunks = chunkDocument(doc, { chunkSize: 1000, overlap: 100 });
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks[0]!.content).toHaveLength(1000);
  });

  it("adds documents and retrieves relevant citations for a query", async () => {
    const retriever = new KnowledgeRetriever({ embeddings: new HashEmbeddingProvider(64) });
    await retriever.addDocument({
      id: "doc-1",
      title: "Cats",
      content: "Cats are small domesticated carnivorous mammals.",
      sourceUrl: "https://example.com/cats",
    });
    await retriever.addDocument({
      id: "doc-2",
      title: "Rockets",
      content: "Rockets use propulsion to travel through space.",
    });

    const citations = await retriever.query("Tell me about cats and mammals", 2);
    expect(citations.length).toBeGreaterThan(0);
    expect(citations[0]!.documentTitle).toBe("Cats");

    const formatted = formatCitationList(citations);
    expect(formatted).toContain("Cats");
  });
});
