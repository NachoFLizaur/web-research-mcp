/**
 * Tests for fetch_pages tool.
 *
 * Ported from Python: tests/test_fetch.py (fetch_pages tests)
 * Tests Task 06 implementation: src/server/tools/fetch.ts
 *
 * Mocks global fetch to avoid network calls.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { fetchPages } from "../../src/server/tools/fetch.js";

/**
 * Helper to create a mock Response object.
 */
function createMockResponse(options: {
  ok?: boolean;
  status?: number;
  contentType?: string;
  body?: string;
}): Response {
  const {
    ok = true,
    status = 200,
    contentType = "text/html",
    body = "",
  } = options;
  return {
    ok,
    status,
    headers: new Headers({ "content-type": contentType }),
    text: () => Promise.resolve(body),
  } as Response;
}

let mockFetch: ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch = vi.fn();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchPages", () => {
  // POSITIVE: Verify empty URL list returns empty results
  it("empty urls returns empty result", async () => {
    // Arrange — no URLs
    // Act
    const result = await fetchPages([]);
    // Assert
    expect(result.contents).toEqual({});
    expect(result.errors).toEqual({});
    expect(result.successCount).toBe(0);
    expect(result.errorCount).toBe(0);
  });

  // POSITIVE: Verify fetch_pages returns correct structure
  it("returns expected structure", async () => {
    // Arrange
    mockFetch.mockResolvedValue(
      createMockResponse({
        body: "<html><head><title>Test Page</title></head><body><p>Content</p></body></html>",
        contentType: "text/html; charset=utf-8",
      }),
    );

    // Act
    const result = await fetchPages(["https://example.com"]);

    // Assert
    expect(result).toHaveProperty("contents");
    expect(result).toHaveProperty("titles");
    expect(result).toHaveProperty("errors");
    expect(result).toHaveProperty("successCount");
    expect(result).toHaveProperty("errorCount");
    expect(result.successCount).toBe(1);
    expect(result.errorCount).toBe(0);
  });

  // POSITIVE: Verify content extraction works (nav removed, main kept)
  it("extracts content", async () => {
    // Arrange
    mockFetch.mockResolvedValue(
      createMockResponse({
        body: `
        <html>
        <head><title>Test Page</title></head>
        <body>
        <nav>Navigation</nav>
        <main><p>Main content here</p></main>
        <footer>Footer</footer>
        </body>
        </html>
        `,
        contentType: "text/html; charset=utf-8",
      }),
    );

    // Act
    const result = await fetchPages(["https://example.com"]);

    // Assert
    expect(result.successCount).toBe(1);
    expect(result.contents["https://example.com"]).toBeDefined();
    expect(result.contents["https://example.com"]).toContain("Main content");
  });

  // NEGATIVE: Verify timeout errors are captured
  it("handles timeout", async () => {
    // Arrange — simulate AbortError
    const abortError = new DOMException("The operation was aborted", "AbortError");
    mockFetch.mockRejectedValue(abortError);

    // Act
    const result = await fetchPages(["https://slow.example.com"], 15000, 1);

    // Assert
    expect(result.errorCount).toBe(1);
    expect(result.errors["https://slow.example.com"]).toBeDefined();
    expect(
      result.errors["https://slow.example.com"].toLowerCase(),
    ).toContain("timed out");
  });

  // NEGATIVE: Verify non-HTML content types are handled
  it("handles non-HTML", async () => {
    // Arrange
    mockFetch.mockResolvedValue(
      createMockResponse({
        contentType: "application/json",
        body: '{"key": "value"}',
      }),
    );

    // Act
    const result = await fetchPages(["https://api.example.com/data.json"]);

    // Assert
    expect(result.errorCount).toBe(1);
    expect(
      result.errors["https://api.example.com/data.json"],
    ).toBeDefined();
    expect(result.errors["https://api.example.com/data.json"]).toContain(
      "Non-HTML",
    );
  });

  // NEGATIVE: Verify HTTP errors are captured
  it("handles HTTP error", async () => {
    // Arrange
    mockFetch.mockResolvedValue(
      createMockResponse({
        ok: false,
        status: 404,
      }),
    );

    // Act
    const result = await fetchPages(["https://example.com/notfound"]);

    // Assert
    expect(result.errorCount).toBe(1);
    expect(result.errors["https://example.com/notfound"]).toBeDefined();
    expect(result.errors["https://example.com/notfound"]).toContain("404");
  });

  // POSITIVE: Verify multiple URLs are fetched in parallel
  it("multiple URLs", async () => {
    // Arrange
    mockFetch.mockResolvedValue(
      createMockResponse({
        body: "<html><head><title>Page</title></head><body><p>Content</p></body></html>",
        contentType: "text/html",
      }),
    );

    const urls = [
      "https://example1.com",
      "https://example2.com",
      "https://example3.com",
    ];

    // Act
    const result = await fetchPages(urls);

    // Assert
    expect(result.successCount).toBe(3);
    expect(Object.keys(result.contents)).toHaveLength(3);
    for (const url of urls) {
      expect(result.contents[url]).toBeDefined();
    }
    // Verify fetch was called for each URL
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  // POSITIVE: Verify mixed success and failure results
  it("mixed success and failure", async () => {
    // Arrange — first URL succeeds, second fails
    mockFetch
      .mockResolvedValueOnce(
        createMockResponse({
          body: "<html><head><title>Good</title></head><body><p>Content</p></body></html>",
          contentType: "text/html",
        }),
      )
      .mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 500,
        }),
      );

    // Act
    const result = await fetchPages([
      "https://good.example.com",
      "https://bad.example.com",
    ]);

    // Assert
    expect(result.successCount).toBe(1);
    expect(result.errorCount).toBe(1);
    expect(result.contents["https://good.example.com"]).toBeDefined();
    expect(result.errors["https://bad.example.com"]).toBeDefined();
  });
});
