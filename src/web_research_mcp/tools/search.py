"""Search tool - multi-query DuckDuckGo search."""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any

from ddgs import DDGS

from web_research_mcp.utils.url_utils import deduplicate_urls

logger = logging.getLogger(__name__)

# Thread pool for blocking DuckDuckGo calls
_executor = ThreadPoolExecutor(max_workers=5)


def _search_single_query(query: str, max_results: int) -> list[dict[str, Any]]:
    """
    Execute a single DuckDuckGo search (blocking).
    
    Args:
        query: Search query string
        max_results: Maximum number of results
        
    Returns:
        List of result dicts with 'href', 'title', 'body' keys
    """
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
            return results
    except Exception as e:
        logger.warning(f"Search failed for query '{query}': {e}")
        return []


async def multi_search(queries: list[str], results_per_query: int = 5) -> dict:
    """
    Search using multiple queries and return deduplicated results.
    
    Args:
        queries: List of search queries to execute
        results_per_query: Number of results per query (default: 5)
        
    Returns:
        Dict with:
        - 'urls': List of unique URLs (deduplicated)
        - 'snippets': Dict mapping URL to snippet text
        - 'titles': Dict mapping URL to title
        - 'query_results': Dict mapping query to list of URLs from that query
    """
    logger.info(f"Executing multi_search with {len(queries)} queries")
    
    if not queries:
        return {
            "urls": [],
            "snippets": {},
            "titles": {},
            "query_results": {},
        }
    
    # Execute searches in parallel using thread pool
    loop = asyncio.get_event_loop()
    tasks = [
        loop.run_in_executor(_executor, _search_single_query, query, results_per_query)
        for query in queries
    ]
    
    all_results = await asyncio.gather(*tasks)
    
    # Collect all URLs with their metadata
    url_to_snippet: dict[str, str] = {}
    url_to_title: dict[str, str] = {}
    query_to_urls: dict[str, list[str]] = {}
    all_urls: list[str] = []
    
    for query, results in zip(queries, all_results):
        query_urls = []
        for result in results:
            url = result.get("href", "")
            if not url:
                continue
            
            # Store metadata (first occurrence wins)
            if url not in url_to_snippet:
                url_to_snippet[url] = result.get("body", "")
                url_to_title[url] = result.get("title", "")
            
            query_urls.append(url)
            all_urls.append(url)
        
        query_to_urls[query] = query_urls
    
    # Deduplicate URLs
    unique_urls = deduplicate_urls(all_urls)
    
    logger.info(f"Found {len(all_urls)} total URLs, {len(unique_urls)} unique after deduplication")
    
    return {
        "urls": unique_urls,
        "snippets": {url: url_to_snippet.get(url, "") for url in unique_urls},
        "titles": {url: url_to_title.get(url, "") for url in unique_urls},
        "query_results": query_to_urls,
    }
