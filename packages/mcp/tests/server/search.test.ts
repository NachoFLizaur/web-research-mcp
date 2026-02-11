/**
 * Tests for multi_search tool.
 *
 * Ported from Python: tests/test_search.py (multi_search tests)
 * Tests implementation: src/server/tools/search.ts
 *
 * Mocks global fetch to avoid network calls.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import { multiSearch } from "../../src/server/tools/search.js";

/**
 * Build a fake DuckDuckGo HTML response body containing the given results.
 * Mirrors the structure of https://html.duckduckgo.com/html/ responses.
 */
function buildDdgHtml(
  results: Array<{ url: string; title: string; snippet: string }>,
): string {
  const items = results
    .map(
      (r) => `
    <div class="result results_links results_links_deep web-result">
      <div class="links_main links_deep result__body">
        <h2 class="result__title">
          <a rel="nofollow" class="result__a" href="${r.url}">${r.title}</a>
        </h2>
        <a class="result__snippet" href="${r.url}">${r.snippet}</a>
      </div>
    </div>`,
    )
    .join("\n");

  return `<html><body><div id="links" class="results">${items}</div></body></html>`;
}

/** Create a mock Response object for fetch. */
function mockResponse(body: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as Response;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("multiSearch", () => {
  // POSITIVE: Verify empty query list returns empty results
  it("empty queries returns empty result structure", async () => {
    const result = await multiSearch([]);
    expect(result.urls).toEqual([]);
    expect(result.snippets).toEqual({});
    expect(result.titles).toEqual({});
    expect(result.queryResults).toEqual({});
  });

  // POSITIVE: Verify multi_search returns correct structure
  it("returns expected structure", async () => {
    const html = buildDdgHtml([
      { url: "https://example.com/1", title: "Title 1", snippet: "Snippet 1" },
      { url: "https://example.com/2", title: "Title 2", snippet: "Snippet 2" },
    ]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse(html));

    const result = await multiSearch(["test query"], 2);

    expect(result).toHaveProperty("urls");
    expect(result).toHaveProperty("snippets");
    expect(result).toHaveProperty("titles");
    expect(result).toHaveProperty("queryResults");
    expect(Array.isArray(result.urls)).toBe(true);
    expect(typeof result.snippets).toBe("object");
    expect(result.urls).toHaveLength(2);
    expect(result.urls).toContain("https://example.com/1");
    expect(result.urls).toContain("https://example.com/2");
    expect(result.snippets["https://example.com/1"]).toBe("Snippet 1");
    expect(result.titles["https://example.com/1"]).toBe("Title 1");
  });

  // POSITIVE: Verify URLs are deduplicated across multiple queries
  it("deduplicates across queries", async () => {
    const html1 = buildDdgHtml([
      {
        url: "https://example.com/shared",
        title: "T1",
        snippet: "S1",
      },
      {
        url: "https://example.com/unique1",
        title: "T2",
        snippet: "S2",
      },
    ]);
    const html2 = buildDdgHtml([
      {
        url: "https://www.example.com/shared",
        title: "T3",
        snippet: "S3",
      },
      {
        url: "https://example.com/unique2",
        title: "T4",
        snippet: "S4",
      },
    ]);

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy
      .mockResolvedValueOnce(mockResponse(html1))
      .mockResolvedValueOnce(mockResponse(html2));

    const result = await multiSearch(["query1", "query2"], 2);

    // Should have 3 unique URLs (shared is deduplicated via www normalization)
    expect(result.urls).toHaveLength(3);
  });

  // POSITIVE: Verify query-to-URL mapping is preserved
  it("preserves query mapping", async () => {
    const html1 = buildDdgHtml([
      { url: "https://example.com/a", title: "A", snippet: "SA" },
    ]);
    const html2 = buildDdgHtml([
      { url: "https://example.com/b", title: "B", snippet: "SB" },
    ]);

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy
      .mockResolvedValueOnce(mockResponse(html1))
      .mockResolvedValueOnce(mockResponse(html2));

    const result = await multiSearch(["query1", "query2"], 5);

    expect(result.queryResults).toHaveProperty("query1");
    expect(result.queryResults).toHaveProperty("query2");
    expect(result.queryResults["query1"]).toContain("https://example.com/a");
    expect(result.queryResults["query2"]).toContain("https://example.com/b");
  });

  // NEGATIVE: Verify search failure is handled gracefully
  it("handles search failure", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("Network error"),
    );

    const result = await multiSearch(["failing query"], 5);

    // Should return empty results for that query, no crash
    expect(result.urls).toEqual([]);
    expect(result.queryResults["failing query"]).toEqual([]);
  });

  // NEGATIVE: Verify HTTP error is handled gracefully
  it("handles HTTP error response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse("Rate limited", 429),
    );

    const result = await multiSearch(["rate limited query"], 5);

    expect(result.urls).toEqual([]);
    expect(result.queryResults["rate limited query"]).toEqual([]);
  });

  // POSITIVE: Verify DDG redirect links are filtered out
  it("filters out DDG redirect links", async () => {
    const html = buildDdgHtml([
      { url: "https://example.com/real", title: "Real", snippet: "Real result" },
    ]);
    // Inject a DDG redirect link manually
    const htmlWithRedirect = html.replace(
      "</div></body>",
      `<div class="result">
        <a class="result__a" href="https://duckduckgo.com/y.js?ad_provider=bingv7aa">Ad</a>
        <a class="result__snippet" href="#">Ad snippet</a>
      </div></div></body>`,
    );

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse(htmlWithRedirect),
    );

    const result = await multiSearch(["test"], 5);

    expect(result.urls).toHaveLength(1);
    expect(result.urls[0]).toBe("https://example.com/real");
  });
});
