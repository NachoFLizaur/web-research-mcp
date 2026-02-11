/**
 * Fetch tool — parallel page fetching with content extraction.
 *
 * Ported from Python: src/web_research_mcp/tools/fetch.py
 * Uses native fetch (Node 18+ / undici) for HTTP requests and
 * content utils from Task 04 for HTML extraction.
 */

import { extractContent, extractTitle } from "../utils/content.js";

/** Browser-like headers to avoid bot detection */
const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Accept-Encoding": "gzip, deflate",
  Connection: "keep-alive",
};

interface FetchResult {
  contents: Record<string, string>;
  titles: Record<string, string>;
  errors: Record<string, string>;
  successCount: number;
  errorCount: number;
}

/**
 * Fetch a single page and extract content.
 */
async function fetchSinglePage(
  url: string,
  timeout: number,
  maxChars: number,
): Promise<{
  content: string | null;
  title: string | null;
  error: string | null;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

    try {
      const response = await fetch(url, {
        headers: DEFAULT_HEADERS,
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          content: null,
          title: null,
          error: `HTTP ${response.status}`,
        };
      }

      // Check content type
      const contentType = response.headers.get("content-type") || "";
      if (
        !contentType.includes("text/html") &&
        !contentType.includes("application/xhtml")
      ) {
        return {
          content: null,
          title: null,
          error: `Non-HTML content type: ${contentType}`,
        };
      }

      const html = await response.text();
      const content = extractContent(html, maxChars);
      const title = extractTitle(html);

      return { content, title, error: null };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        content: null,
        title: null,
        error: `Request timed out after ${timeout}s`,
      };
    }
    const message =
      error instanceof Error ? error.message : String(error);
    return { content: null, title: null, error: message };
  }
}

/**
 * Fetch multiple pages in parallel and extract content.
 *
 * Uses Promise.all for parallel fetching (replaces Python's
 * ThreadPoolExecutor with max_workers=10).
 */
export async function fetchPages(
  urls: string[],
  maxChars: number = 15000,
  timeout: number = 30,
): Promise<FetchResult> {
  if (urls.length === 0) {
    return {
      contents: {},
      titles: {},
      errors: {},
      successCount: 0,
      errorCount: 0,
    };
  }

  // Fetch all URLs in parallel
  const results = await Promise.all(
    urls.map((url) => fetchSinglePage(url, timeout, maxChars)),
  );

  // Organize results
  const contents: Record<string, string> = {};
  const titles: Record<string, string> = {};
  const errors: Record<string, string> = {};

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const result = results[i];

    if (result.error) {
      errors[url] = result.error;
    } else {
      if (result.content) contents[url] = result.content;
      if (result.title) titles[url] = result.title;
    }
  }

  return {
    contents,
    titles,
    errors,
    successCount: Object.keys(contents).length,
    errorCount: Object.keys(errors).length,
  };
}
