"""Fetch tool - parallel page fetching with content extraction."""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import requests

from web_research_mcp.utils.content_utils import extract_content, extract_title

logger = logging.getLogger(__name__)

# Thread pool for blocking HTTP requests
_executor = ThreadPoolExecutor(max_workers=10)

# Default headers to mimic a browser
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "keep-alive",
}


def _fetch_single_page(url: str, timeout: int, max_chars: int) -> dict[str, Any]:
    """
    Fetch a single page and extract content (blocking).
    
    Args:
        url: URL to fetch
        timeout: Request timeout in seconds
        max_chars: Maximum characters to extract
        
    Returns:
        Dict with 'content', 'title', 'error' keys
    """
    try:
        response = requests.get(
            url,
            headers=DEFAULT_HEADERS,
            timeout=timeout,
            allow_redirects=True,
        )
        response.raise_for_status()
        
        # Check content type
        content_type = response.headers.get("Content-Type", "")
        if "text/html" not in content_type and "application/xhtml" not in content_type:
            return {
                "content": None,
                "title": None,
                "error": f"Non-HTML content type: {content_type}",
            }
        
        html = response.text
        content = extract_content(html, max_chars)
        title = extract_title(html)
        
        return {
            "content": content,
            "title": title,
            "error": None,
        }
        
    except requests.Timeout:
        return {
            "content": None,
            "title": None,
            "error": f"Request timed out after {timeout}s",
        }
    except requests.RequestException as e:
        return {
            "content": None,
            "title": None,
            "error": str(e),
        }
    except Exception as e:
        return {
            "content": None,
            "title": None,
            "error": f"Unexpected error: {e}",
        }


async def fetch_pages(
    urls: list[str],
    max_chars: int = 15000,
    timeout: int = 30,
) -> dict:
    """
    Fetch multiple pages in parallel and extract content.
    
    Args:
        urls: List of URLs to fetch
        max_chars: Maximum characters per page (default: 15000)
        timeout: Timeout in seconds per request (default: 30)
        
    Returns:
        Dict with:
        - 'contents': Dict mapping URL to extracted content
        - 'titles': Dict mapping URL to page title
        - 'errors': Dict mapping URL to error message (for failed fetches)
        - 'success_count': Number of successfully fetched pages
        - 'error_count': Number of failed fetches
    """
    logger.info(f"Fetching {len(urls)} pages with max_chars={max_chars}, timeout={timeout}")
    
    if not urls:
        return {
            "contents": {},
            "titles": {},
            "errors": {},
            "success_count": 0,
            "error_count": 0,
        }
    
    # Execute fetches in parallel using thread pool
    loop = asyncio.get_event_loop()
    tasks = [
        loop.run_in_executor(_executor, _fetch_single_page, url, timeout, max_chars)
        for url in urls
    ]
    
    results = await asyncio.gather(*tasks)
    
    # Organize results
    contents: dict[str, str] = {}
    titles: dict[str, str] = {}
    errors: dict[str, str] = {}
    
    for url, result in zip(urls, results):
        if result["error"]:
            errors[url] = result["error"]
            logger.warning(f"Failed to fetch {url}: {result['error']}")
        else:
            contents[url] = result["content"]
            if result["title"]:
                titles[url] = result["title"]
    
    success_count = len(contents)
    error_count = len(errors)
    
    logger.info(f"Fetch complete: {success_count} success, {error_count} errors")
    
    return {
        "contents": contents,
        "titles": titles,
        "errors": errors,
        "success_count": success_count,
        "error_count": error_count,
    }
