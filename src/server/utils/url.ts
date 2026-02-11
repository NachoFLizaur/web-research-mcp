/**
 * URL normalization and deduplication utilities.
 *
 * Ported from Python: src/web_research_mcp/utils/url_utils.py
 */

/**
 * Tracking parameters to remove during URL normalization.
 */
const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "utm_source_platform",
  "utm_creative_format",
  "utm_marketing_tactic",
  "fbclid",
  "gclid",
  "gclsrc",
  "dclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "twclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_",
  "source",
  "src",
]);

/**
 * Normalize a URL for deduplication.
 * - Lowercase the domain
 * - Remove www. prefix
 * - Remove tracking parameters
 * - Remove trailing slashes (except root)
 * - Remove fragments
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Lowercase and remove www from hostname
    let hostname = parsed.hostname.toLowerCase();
    if (hostname.startsWith("www.")) {
      hostname = hostname.slice(4);
    }

    // Filter out tracking parameters
    const params = new URLSearchParams();
    for (const [key, value] of parsed.searchParams) {
      if (!TRACKING_PARAMS.has(key.toLowerCase())) {
        params.set(key, value);
      }
    }

    // Remove trailing slash from pathname (but keep root /)
    let pathname = parsed.pathname;
    if (pathname !== "/" && pathname.endsWith("/")) {
      pathname = pathname.replace(/\/+$/, "");
    }

    // Reconstruct without fragment
    const query = params.toString();
    return `${parsed.protocol}//${hostname}${pathname}${query ? "?" + query : ""}`;
  } catch {
    return url;
  }
}

/**
 * Deduplicate URLs using normalization.
 * Returns original URL forms, not normalized.
 * Preserves order (first occurrence wins).
 */
export function deduplicateUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const url of urls) {
    const normalized = normalizeUrl(url);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(url);
    }
  }

  return unique;
}
