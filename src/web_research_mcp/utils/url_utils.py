"""URL utilities for normalization and deduplication."""

from urllib.parse import urlparse, urlunparse, parse_qs, urlencode

# Tracking parameters to remove
TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "utm_id", "utm_source_platform", "utm_creative_format", "utm_marketing_tactic",
    "fbclid", "gclid", "gclsrc", "dclid", "gbraid", "wbraid",
    "msclkid", "twclid", "igshid", "mc_cid", "mc_eid",
    "ref", "ref_", "source", "src",
}


def normalize_url(url: str) -> str:
    """
    Normalize a URL for deduplication.
    
    - Lowercase the domain
    - Remove www. prefix
    - Remove tracking parameters
    - Remove trailing slashes (except for root)
    - Remove fragments
    
    Args:
        url: The URL to normalize
        
    Returns:
        Normalized URL string
    """
    try:
        parsed = urlparse(url)
        
        # Lowercase and remove www from domain
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        
        # Filter out tracking parameters
        if parsed.query:
            params = parse_qs(parsed.query, keep_blank_values=True)
            filtered_params = {
                k: v for k, v in params.items()
                if k.lower() not in TRACKING_PARAMS
            }
            query = urlencode(filtered_params, doseq=True)
        else:
            query = ""
        
        # Remove trailing slash from path (but keep root /)
        path = parsed.path
        if path != "/" and path.endswith("/"):
            path = path.rstrip("/")
        
        # Reconstruct URL without fragment
        normalized = urlunparse((
            parsed.scheme,
            netloc,
            path,
            "",  # params
            query,
            "",  # fragment
        ))
        
        return normalized
    except Exception:
        # If parsing fails, return original
        return url


def deduplicate_urls(urls: list[str]) -> list[str]:
    """
    Deduplicate URLs using normalization.
    
    Args:
        urls: List of URLs to deduplicate
        
    Returns:
        List of unique URLs (original form, not normalized)
    """
    seen_normalized: set[str] = set()
    unique_urls: list[str] = []
    
    for url in urls:
        normalized = normalize_url(url)
        if normalized not in seen_normalized:
            seen_normalized.add(normalized)
            unique_urls.append(url)
    
    return unique_urls
