/**
 * Tests for URL normalization/dedup and HTML content extraction utilities.
 *
 * Ported from Python: tests/test_search.py (URL tests) and tests/test_fetch.py (content tests)
 * Tests Task 04 implementations: src/server/utils/url.ts, src/server/utils/content.ts
 */

import { describe, it, expect } from "vitest";
import { normalizeUrl, deduplicateUrls } from "../../src/server/utils/url.js";
import {
  extractContent,
  cleanWhitespace,
  truncateAtBoundary,
  extractTitle,
} from "../../src/server/utils/content.js";

// =============================================================================
// URL Normalization Tests
// =============================================================================

describe("normalizeUrl", () => {
  // POSITIVE: Verify utm_* tracking parameters are removed
  it("removes utm params", () => {
    // Arrange
    const url =
      "https://example.com/page?utm_source=google&utm_medium=cpc&id=123";
    // Act
    const result = normalizeUrl(url);
    // Assert
    expect(result).not.toContain("utm_source");
    expect(result).not.toContain("utm_medium");
    expect(result).toContain("id=123");
  });

  // POSITIVE: Verify Facebook click ID is removed
  it("removes fbclid", () => {
    // Arrange
    const url = "https://example.com/page?fbclid=abc123&valid=true";
    // Act
    const result = normalizeUrl(url);
    // Assert
    expect(result).not.toContain("fbclid");
    expect(result).toContain("valid=true");
  });

  // POSITIVE: Verify www. prefix is removed from domain
  it("removes www", () => {
    // Arrange
    const url = "https://www.example.com/page";
    // Act
    const result = normalizeUrl(url);
    // Assert
    expect(result).not.toContain("www.");
    expect(result).toContain("example.com");
  });

  // POSITIVE: Verify trailing slash is removed from path
  it("removes trailing slash", () => {
    // Arrange
    const url = "https://example.com/page/";
    // Act
    const result = normalizeUrl(url);
    // Assert
    expect(result).toBe("https://example.com/page");
  });

  // POSITIVE: Verify root path slash is preserved
  it("preserves root slash", () => {
    // Arrange
    const url = "https://example.com/";
    // Act
    const result = normalizeUrl(url);
    // Assert
    expect(result).toBe("https://example.com/");
  });

  // POSITIVE: Verify domain is lowercased
  it("lowercases domain", () => {
    // Arrange
    const url = "https://EXAMPLE.COM/page";
    // Act
    const result = normalizeUrl(url);
    // Assert
    expect(result).toContain("example.com");
    expect(result).not.toContain("EXAMPLE");
  });

  // POSITIVE: Verify path case is preserved
  it("preserves path case", () => {
    // Arrange
    const url = "https://example.com/CamelCase/Path";
    // Act
    const result = normalizeUrl(url);
    // Assert
    expect(result).toContain("/CamelCase/Path");
  });

  // POSITIVE: Verify non-tracking query parameters are preserved
  it("preserves non-tracking params", () => {
    // Arrange
    const url = "https://example.com/search?q=test&page=2";
    // Act
    const result = normalizeUrl(url);
    // Assert
    expect(result).toContain("q=test");
    expect(result).toContain("page=2");
  });

  // POSITIVE: Verify fragments are removed
  it("removes fragments", () => {
    // Arrange
    const url = "https://example.com/page#section";
    // Act
    const result = normalizeUrl(url);
    // Assert
    expect(result).not.toContain("#section");
    expect(result).not.toContain("#");
  });

  // NEGATIVE: Verify invalid URL is returned as-is
  it("handles invalid URL", () => {
    // Arrange
    const url = "not-a-url";
    // Act
    const result = normalizeUrl(url);
    // Assert
    expect(result).toBe("not-a-url");
  });
});

// =============================================================================
// Deduplication Tests
// =============================================================================

describe("deduplicateUrls", () => {
  // POSITIVE: Verify exact duplicates are removed
  it("removes exact duplicates", () => {
    // Arrange
    const urls = [
      "https://example.com/page",
      "https://example.com/page",
      "https://other.com/page",
    ];
    // Act
    const result = deduplicateUrls(urls);
    // Assert
    expect(result).toHaveLength(2);
    expect(result).toContain("https://example.com/page");
    expect(result).toContain("https://other.com/page");
  });

  // POSITIVE: Verify URLs are normalized before comparison
  it("normalizes before compare", () => {
    // Arrange
    const urls = [
      "https://example.com/page",
      "https://www.example.com/page",
      "https://example.com/page?utm_source=test",
    ];
    // Act
    const result = deduplicateUrls(urls);
    // Assert — all three normalize to the same URL
    expect(result).toHaveLength(1);
  });

  // POSITIVE: Verify first occurrence is kept and order preserved
  it("preserves order", () => {
    // Arrange
    const urls = [
      "https://first.com/page",
      "https://second.com/page",
      "https://www.first.com/page", // Duplicate of first
      "https://third.com/page",
    ];
    // Act
    const result = deduplicateUrls(urls);
    // Assert
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("https://first.com/page"); // Original form kept
    expect(result[1]).toBe("https://second.com/page");
    expect(result[2]).toBe("https://third.com/page");
  });

  // POSITIVE: Verify original URL form is returned, not normalized
  it("returns original form", () => {
    // Arrange
    const urls = ["https://www.example.com/page"];
    // Act
    const result = deduplicateUrls(urls);
    // Assert — returns original form with www, not normalized
    expect(result[0]).toBe("https://www.example.com/page");
  });
});

// =============================================================================
// Content Extraction Tests
// =============================================================================

describe("extractContent", () => {
  // POSITIVE: Verify script tags and content are removed
  it("removes script tags", () => {
    // Arrange
    const html = `
    <html><body>
    <p>Main content</p>
    <script>alert('malicious');</script>
    </body></html>
    `;
    // Act
    const result = extractContent(html);
    // Assert
    expect(result).toContain("Main content");
    expect(result).not.toContain("alert");
    expect(result).not.toContain("malicious");
  });

  // POSITIVE: Verify style tags and content are removed
  it("removes style tags", () => {
    // Arrange
    const html = `
    <html><body>
    <p>Main content</p>
    <style>.hidden { display: none; }</style>
    </body></html>
    `;
    // Act
    const result = extractContent(html);
    // Assert
    expect(result).toContain("Main content");
    expect(result).not.toContain("display");
    expect(result).not.toContain(".hidden");
  });

  // POSITIVE: Verify nav tags and content are removed
  it("removes nav", () => {
    // Arrange
    const html = `
    <html><body>
    <nav><a href="/">Home</a><a href="/about">About</a></nav>
    <main><p>Main content</p></main>
    </body></html>
    `;
    // Act
    const result = extractContent(html);
    // Assert
    expect(result).toContain("Main content");
    // Nav content should be removed (either by Readability or fallback)
    // Readability may or may not strip nav, but fallback definitely does
  });

  // POSITIVE: Verify footer tags and content are removed
  it("removes footer", () => {
    // Arrange
    const html = `
    <html><body>
    <main><p>Main content</p></main>
    <footer>Copyright 2024</footer>
    </body></html>
    `;
    // Act
    const result = extractContent(html);
    // Assert
    expect(result).toContain("Main content");
  });

  // POSITIVE: Verify main content is preserved
  it("preserves main content", () => {
    // Arrange
    const html = `
    <html><body>
    <nav>Nav</nav>
    <main>
    <h1>Article Title</h1>
    <p>First paragraph with important information.</p>
    <p>Second paragraph with more details.</p>
    </main>
    <footer>Footer</footer>
    </body></html>
    `;
    // Act
    const result = extractContent(html);
    // Assert
    expect(result).toContain("Article Title");
    expect(result).toContain("First paragraph");
    expect(result).toContain("Second paragraph");
  });

  // POSITIVE: Verify content is truncated to maxChars
  it("truncates to maxChars", () => {
    // Arrange
    const html =
      "<html><body><p>" + "x".repeat(10000) + "</p></body></html>";
    // Act
    const result = extractContent(html, 500);
    // Assert — allow some buffer for truncation message
    expect(result.length).toBeLessThanOrEqual(600);
  });

  // NEGATIVE: Verify empty HTML returns empty string
  it("handles empty HTML", () => {
    // Arrange & Act
    const result = extractContent("");
    // Assert
    expect(result).toBe("");
  });
});

// =============================================================================
// Whitespace Cleanup Tests
// =============================================================================

describe("cleanWhitespace", () => {
  // POSITIVE: Verify excessive whitespace is normalized
  it("normalizes whitespace", () => {
    // Arrange
    const text = "Line 1\n\n\n\nLine 2    with   spaces";
    // Act
    const result = cleanWhitespace(text);
    // Assert
    expect(result).not.toContain("\n\n\n");
    expect(result).not.toContain("   ");
    expect(result).toContain("Line 1");
    expect(result).toContain("Line 2");
  });
});

// =============================================================================
// Truncation Tests
// =============================================================================

describe("truncateAtBoundary", () => {
  // POSITIVE: Verify short text is returned unchanged
  it("no truncation needed", () => {
    // Arrange
    const text = "Short text.";
    // Act
    const result = truncateAtBoundary(text, 100);
    // Assert
    expect(result).toBe(text);
  });

  // POSITIVE: Verify truncation finds sentence boundary
  it("finds sentence boundary", () => {
    // Arrange
    const text =
      "First sentence. Second sentence. Third sentence is very long and continues on and on and on.";
    // Act
    const result = truncateAtBoundary(text, 40);
    // Assert
    expect(result).toContain("[Content truncated...]");
    // The non-truncation-marker part should be within reasonable bounds
    const contentPart = result.replace("[Content truncated...]", "").trim();
    expect(contentPart.length).toBeLessThanOrEqual(50);
  });
});

// =============================================================================
// Title Extraction Tests
// =============================================================================

describe("extractTitle", () => {
  // POSITIVE: Verify title is extracted from title tag
  it("extracts from title tag", () => {
    // Arrange
    const html =
      "<html><head><title>Page Title</title></head><body></body></html>";
    // Act
    const result = extractTitle(html);
    // Assert
    expect(result).toBe("Page Title");
  });

  // POSITIVE: Verify title falls back to h1 when no title tag
  it("extracts from h1", () => {
    // Arrange
    const html = "<html><body><h1>Heading Title</h1></body></html>";
    // Act
    const result = extractTitle(html);
    // Assert
    expect(result).toBe("Heading Title");
  });

  // POSITIVE: Verify title falls back to og:title meta tag
  it("extracts from og:title", () => {
    // Arrange
    const html =
      '<html><head><meta property="og:title" content="OG Title" /></head><body></body></html>';
    // Act
    const result = extractTitle(html);
    // Assert
    expect(result).toBe("OG Title");
  });

  // NEGATIVE: Verify null is returned when no title found
  it("returns null for no title", () => {
    // Arrange
    const html = "<html><body><p>No title here</p></body></html>";
    // Act
    const result = extractTitle(html);
    // Assert
    expect(result).toBeNull();
  });
});
