/**
 * Search tool — multi-query DuckDuckGo search with deduplication.
 *
 * Ported from Python: src/web_research_mcp/tools/search.py
 * Scrapes DuckDuckGo's HTML endpoint (html.duckduckgo.com/html/) via POST,
 * matching the approach used by the Python `ddgs` library's DuckDuckGo engine.
 * This avoids the aggressive anomaly detection on the JS API endpoint.
 *
 * Queries run sequentially with a small delay between them to avoid
 * rate limiting, matching the Python version's behavior.
 */

import { parseHTML } from "linkedom";
import { deduplicateUrls } from "../utils/url.js";

interface SearchResult {
  urls: string[];
  snippets: Record<string, string>;
  titles: Record<string, string>;
  queryResults: Record<string, string[]>;
}

/** Rotating pool of realistic user agents (matches Python's fake_useragent approach). */
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
];

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/** Delay helper. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a single DuckDuckGo search by scraping the HTML endpoint.
 *
 * Uses POST to https://html.duckduckgo.com/html/ — the same endpoint
 * the Python ddgs library's Duckduckgo engine uses. This endpoint is
 * far more tolerant of automated requests than the JS API.
 */
async function searchSingleQuery(
  query: string,
  maxResults: number,
): Promise<Array<{ url: string; title: string; snippet: string }>> {
  try {
    const body = new URLSearchParams({ q: query, b: "", l: "us-en" });

    const response = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "User-Agent": randomUserAgent(),
        "Content-Type": "application/x-www-form-urlencoded",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        Referer: "https://html.duckduckgo.com/",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      console.error(
        `DDG HTML search returned HTTP ${response.status} for "${query}"`,
      );
      return [];
    }

    const html = await response.text();
    return parseDdgHtmlResults(html, maxResults);
  } catch (error) {
    console.error(`Search failed for query "${query}":`, error);
    return [];
  }
}

/**
 * Parse search results from DuckDuckGo's HTML response.
 *
 * Mirrors the Python ddgs engine's XPath-based extraction:
 *   items_xpath = "//div[contains(@class, 'body')]"
 *   title: ".//h2//text()"
 *   href:  "./a/@href"
 *   body:  "./a//text()"
 *
 * The HTML endpoint wraps each result in a div.result with a nested
 * div.result__body containing the link, title, and snippet.
 */
function parseDdgHtmlResults(
  html: string,
  maxResults: number,
): Array<{ url: string; title: string; snippet: string }> {
  const { document } = parseHTML(html);
  const results: Array<{ url: string; title: string; snippet: string }> = [];

  // Each organic result lives in a div with class "result" or "result__body"
  const resultDivs = document.querySelectorAll(".result");

  for (const div of resultDivs) {
    if (results.length >= maxResults) break;

    // Extract the link — the main result link has class "result__a"
    const linkEl = div.querySelector("a.result__a");
    if (!linkEl) continue;

    const href = linkEl.getAttribute("href") || "";
    // Skip DDG redirect links (y.js tracking URLs)
    if (!href || href.startsWith("https://duckduckgo.com/y.js?")) continue;

    const title = (linkEl.textContent || "").trim();

    // Extract snippet from the result__snippet element
    const snippetEl = div.querySelector(".result__snippet");
    const snippet = snippetEl ? (snippetEl.textContent || "").trim() : "";

    if (href && title) {
      results.push({ url: href, title, snippet });
    }
  }

  return results;
}

/** Delay between sequential queries (ms). Avoids rate limiting. */
const INTER_QUERY_DELAY_MS = 400;

/**
 * Search using multiple queries and return deduplicated results.
 *
 * Runs queries sequentially with a small delay between each to avoid
 * rate limiting. Deduplicates URLs across all queries.
 */
export async function multiSearch(
  queries: string[],
  resultsPerQuery: number = 5,
): Promise<SearchResult> {
  if (queries.length === 0) {
    return { urls: [], snippets: {}, titles: {}, queryResults: {} };
  }

  // Execute searches sequentially with delay to avoid rate limiting
  const allResults: Array<
    Array<{ url: string; title: string; snippet: string }>
  > = [];
  for (let i = 0; i < queries.length; i++) {
    if (i > 0) {
      await delay(INTER_QUERY_DELAY_MS);
    }
    const results = await searchSingleQuery(queries[i], resultsPerQuery);
    allResults.push(results);
  }

  // Collect URLs with metadata
  const urlToSnippet: Record<string, string> = {};
  const urlToTitle: Record<string, string> = {};
  const queryToUrls: Record<string, string[]> = {};
  const allUrls: string[] = [];

  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    const results = allResults[i];
    const queryUrls: string[] = [];

    for (const result of results) {
      if (!result.url) continue;

      // First occurrence wins for metadata
      if (!(result.url in urlToSnippet)) {
        urlToSnippet[result.url] = result.snippet;
        urlToTitle[result.url] = result.title;
      }

      queryUrls.push(result.url);
      allUrls.push(result.url);
    }

    queryToUrls[query] = queryUrls;
  }

  // Deduplicate
  const uniqueUrls = deduplicateUrls(allUrls);

  return {
    urls: uniqueUrls,
    snippets: Object.fromEntries(
      uniqueUrls.map((url) => [url, urlToSnippet[url] || ""]),
    ),
    titles: Object.fromEntries(
      uniqueUrls.map((url) => [url, urlToTitle[url] || ""]),
    ),
    queryResults: queryToUrls,
  };
}
