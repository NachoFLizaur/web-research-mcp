/**
 * HTML content extraction, cleanup, and truncation utilities.
 *
 * Ported from Python: src/web_research_mcp/utils/content_utils.py
 * Uses @mozilla/readability + linkedom for primary extraction,
 * with fallback to manual tag stripping.
 */

import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

/** Tags to remove entirely (including their content) */
const REMOVE_TAGS = new Set([
  "script",
  "style",
  "nav",
  "footer",
  "header",
  "aside",
  "noscript",
  "iframe",
  "svg",
  "form",
  "button",
]);

/** Class/ID substrings that indicate boilerplate */
const BOILERPLATE_PATTERNS = new Set([
  "nav",
  "navbar",
  "navigation",
  "menu",
  "sidebar",
  "footer",
  "header",
  "advertisement",
  "ad",
  "ads",
  "social",
  "share",
  "comment",
  "comments",
  "related",
]);

/**
 * Extract clean text content from HTML.
 *
 * Uses @mozilla/readability for primary extraction, with
 * fallback to manual tag stripping.
 */
export function extractContent(
  html: string,
  maxChars: number = 15000,
): string {
  if (!html) return "";

  try {
    // Try Readability first (best quality)
    const { document } = parseHTML(html);
    // linkedom's document is DOM-compatible but not typed as browser Document
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reader = new Readability(document.cloneNode(true) as any);
    const article = reader.parse();

    if (article?.textContent) {
      const cleaned = cleanWhitespace(article.textContent);
      return cleaned.length > maxChars
        ? truncateAtBoundary(cleaned, maxChars)
        : cleaned;
    }

    // Fallback: manual extraction (port from Python)
    return fallbackExtract(html, maxChars);
  } catch {
    return fallbackExtract(html, maxChars);
  }
}

/**
 * Fallback extraction — strips unwanted tags manually.
 * Direct port of the Python BeautifulSoup approach using linkedom.
 */
function fallbackExtract(html: string, maxChars: number): string {
  try {
    const { document } = parseHTML(html);

    // Remove unwanted tags
    for (const tag of REMOVE_TAGS) {
      for (const el of document.querySelectorAll(tag)) {
        el.remove();
      }
    }

    // Remove elements with boilerplate class names or IDs
    for (const el of document.querySelectorAll("*")) {
      const className = (el.getAttribute("class") || "").toLowerCase();
      const id = (el.getAttribute("id") || "").toLowerCase();

      for (const pattern of BOILERPLATE_PATTERNS) {
        if (className.includes(pattern) || id.includes(pattern)) {
          el.remove();
          break;
        }
      }
    }

    const text = document.body?.textContent || "";
    const cleaned = cleanWhitespace(text);
    return cleaned.length > maxChars
      ? truncateAtBoundary(cleaned, maxChars)
      : cleaned;
  } catch {
    return "";
  }
}

/**
 * Clean up excessive whitespace in text.
 */
export function cleanWhitespace(text: string): string {
  let result = text;
  // Replace 3+ newlines with double newline
  result = result.replace(/\n{3,}/g, "\n\n");
  // Replace 2+ spaces with single space
  result = result.replace(/ {2,}/g, " ");
  // Trim each line
  result = result
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
  return result.trim();
}

/**
 * Truncate text at a natural boundary (paragraph > sentence > word).
 */
export function truncateAtBoundary(
  text: string,
  maxChars: number,
): string {
  if (text.length <= maxChars) return text;

  const truncated = text.slice(0, maxChars);

  // Try paragraph boundary (at least 70% of content)
  const lastPara = truncated.lastIndexOf("\n\n");
  if (lastPara > maxChars * 0.7) {
    return truncated.slice(0, lastPara).trim() + "\n\n[Content truncated...]";
  }

  // Try sentence boundary
  const lastSentence = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("! "),
    truncated.lastIndexOf("? "),
  );
  if (lastSentence > maxChars * 0.7) {
    return (
      truncated.slice(0, lastSentence + 1).trim() +
      "\n\n[Content truncated...]"
    );
  }

  // Try word boundary
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxChars * 0.8) {
    return truncated.slice(0, lastSpace).trim() + "...\n\n[Content truncated...]";
  }

  // Hard truncate
  return truncated.trim() + "...\n\n[Content truncated...]";
}

/**
 * Extract page title from HTML.
 */
export function extractTitle(html: string): string | null {
  try {
    const { document } = parseHTML(html);

    // Try <title> tag
    const titleEl = document.querySelector("title");
    if (titleEl?.textContent?.trim()) {
      return titleEl.textContent.trim();
    }

    // Try <h1>
    const h1 = document.querySelector("h1");
    if (h1?.textContent?.trim()) {
      return h1.textContent.trim();
    }

    // Try og:title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      const content = ogTitle.getAttribute("content");
      if (content?.trim()) return content.trim();
    }

    return null;
  } catch {
    return null;
  }
}
