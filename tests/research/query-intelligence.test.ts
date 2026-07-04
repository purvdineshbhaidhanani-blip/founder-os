import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSearchIntent,
  buildSourceSpecificQueries,
  generateAndLogQueries,
  FIXED_SEARCH_TERMS,
  GENERAL_UNCLASSIFIED_INDUSTRY,
  MAX_QUERIES_PER_SOURCE,
  SOURCE_SUFFIXES,
} from "../../src/research/query-intelligence.js";

describe("buildSearchIntent", () => {
  it("maps 'AI SaaS' to a real industry match with real entities and the exact fixed searchTerms list", () => {
    const intent = buildSearchIntent("AI SaaS");

    expect(intent.rawQuery).toBe("AI SaaS");
    expect(intent.industry).toBe("AI Software");
    expect(intent.industryConfidence).toBe("high");
    expect(intent.entities.length).toBeGreaterThan(0);
    expect(intent.entities).toEqual(["LLM", "AI Tools", "Generative AI", "AI Startup", "AI Automation"]);
    // Exact, byte-for-byte, since the vocabulary is intentionally query-independent.
    expect(intent.searchTerms).toEqual([
      "complaints",
      "feature requests",
      "pricing",
      "alternatives",
      "migration",
      "reviews",
      "problems",
      "limitations",
      "pain points",
    ]);
    expect(intent.searchTerms).toEqual([...FIXED_SEARCH_TERMS]);
  });

  it("maps 'fintech app' to a different real industry/entities than 'AI SaaS'", () => {
    const intent = buildSearchIntent("fintech app");

    expect(intent.industry).toBe("Fintech");
    expect(intent.industryConfidence).toBe("high");
    expect(intent.entities).toEqual(["Digital Wallet", "Payments API", "Neobank", "Lending Platform", "Fraud Detection"]);
    // Same fixed vocabulary regardless of industry.
    expect(intent.searchTerms).toEqual([...FIXED_SEARCH_TERMS]);
  });

  it("maps 'recruiting software' to the HR/Recruiting industry", () => {
    const intent = buildSearchIntent("recruiting software");

    expect(intent.industry).toBe("HR/Recruiting");
    expect(intent.industryConfidence).toBe("high");
    expect(intent.entities).toEqual(["Applicant Tracking System", "HRIS", "Recruiting Platform", "Payroll Software"]);
  });

  it("falls back honestly to General/Unclassified with low confidence for a nonsense query", () => {
    const intent = buildSearchIntent("xyzzy plugh");

    expect(intent.industry).toBe(GENERAL_UNCLASSIFIED_INDUSTRY);
    expect(intent.industryConfidence).toBe("low");
    expect(intent.entities).toEqual([]);
    // Never a fabricated industry name.
    expect(intent.industry).not.toMatch(/AI|Fintech|SaaS|Health|Devtools|Marketing|HR|Productivity|Education|Real Estate/);
    expect(intent.searchTerms).toEqual([...FIXED_SEARCH_TERMS]);
  });
});

describe("buildSourceSpecificQueries", () => {
  it("produces real per-source query arrays from the 'AI SaaS' intent, each respecting the documented cap", () => {
    const intent = buildSearchIntent("AI SaaS");
    const queries = buildSourceSpecificQueries(intent);

    expect(queries.github).toContain("LLM issues");
    expect(queries.github).toContain("AI Tools feature requests");
    expect(queries.reddit).toContain("LLM complaints");
    expect(queries.reddit).toContain("AI Tools alternatives");
    expect(queries.youtube).toContain("LLM reviews");
    expect(queries.hackernews).toContain("LLM Show HN");
    expect(queries.rss).toContain("LLM news");

    for (const source of Object.keys(queries) as Array<keyof typeof queries>) {
      expect(queries[source].length).toBeLessThanOrEqual(MAX_QUERIES_PER_SOURCE);
      // Every entry is a real entity + suffix combination for that source.
      for (const q of queries[source]) {
        const matchesEntitySuffix = intent.entities.some((entity) =>
          SOURCE_SUFFIXES[source].some((suffix) => q === `${entity} ${suffix}`),
        );
        expect(matchesEntitySuffix).toBe(true);
      }
    }

    // 5 entities x 3 suffixes = 15 for github/reddit/youtube/hackernews, capped at 10.
    expect(queries.github.length).toBe(MAX_QUERIES_PER_SOURCE);
    expect(queries.reddit.length).toBe(MAX_QUERIES_PER_SOURCE);
    expect(queries.youtube.length).toBe(MAX_QUERIES_PER_SOURCE);
    expect(queries.hackernews.length).toBe(MAX_QUERIES_PER_SOURCE);
    // 5 entities x 2 suffixes = 10, exactly at the cap, no truncation needed.
    expect(queries.rss.length).toBe(10);
  });

  it("produces no queries for a source when the intent has no entities (unclassified fallback)", () => {
    const intent = buildSearchIntent("xyzzy plugh");
    const queries = buildSourceSpecificQueries(intent);

    expect(queries.github).toEqual([]);
    expect(queries.reddit).toEqual([]);
    expect(queries.youtube).toEqual([]);
    expect(queries.hackernews).toEqual([]);
    expect(queries.rss).toEqual([]);
  });
});

describe("generateAndLogQueries", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
  });

  it("returns both intent and queries correctly composed together", () => {
    const result = generateAndLogQueries("AI SaaS");

    expect(result.intent.industry).toBe("AI Software");
    expect(result.queries).toEqual(buildSourceSpecificQueries(result.intent));
    expect(result.queries.github.length).toBeGreaterThan(0);
  });

  it("logs the structured intent and every generated source's queries", () => {
    generateAndLogQueries("AI SaaS");

    // One log line for the structured intent, plus one per source (5 sources).
    expect(infoSpy).toHaveBeenCalledTimes(6);

    const allLoggedText = infoSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(allLoggedText).toContain("research.query-intelligence");
    expect(allLoggedText).toContain("built structured search intent");
    expect(allLoggedText).toContain("generated github queries");
    expect(allLoggedText).toContain("generated reddit queries");
    expect(allLoggedText).toContain("generated youtube queries");
    expect(allLoggedText).toContain("generated hackernews queries");
    expect(allLoggedText).toContain("generated rss queries");
  });
});
