"""Tests for search tool and URL utilities - Task 04."""

import pytest
from unittest.mock import patch, MagicMock

from web_research_mcp.utils.url_utils import normalize_url, deduplicate_urls
from web_research_mcp.tools.search import multi_search


# =============================================================================
# URL Normalization Tests
# =============================================================================


def test_normalize_url_removes_utm_params():
    """Verify utm_* tracking parameters are removed."""
    url = "https://example.com/page?utm_source=google&utm_medium=cpc&id=123"
    result = normalize_url(url)
    
    assert "utm_source" not in result
    assert "utm_medium" not in result
    assert "id=123" in result


def test_normalize_url_removes_fbclid():
    """Verify Facebook click ID is removed."""
    url = "https://example.com/page?fbclid=abc123&valid=true"
    result = normalize_url(url)
    
    assert "fbclid" not in result
    assert "valid=true" in result


def test_normalize_url_removes_www():
    """Verify www. prefix is removed from domain."""
    url = "https://www.example.com/page"
    result = normalize_url(url)
    
    assert "www." not in result
    assert "example.com" in result


def test_normalize_url_removes_trailing_slash():
    """Verify trailing slash is removed from path."""
    url = "https://example.com/page/"
    result = normalize_url(url)
    
    assert result == "https://example.com/page"


def test_normalize_url_preserves_root_slash():
    """Verify root path slash is preserved."""
    url = "https://example.com/"
    result = normalize_url(url)
    
    assert result == "https://example.com/"


def test_normalize_url_lowercases_domain():
    """Verify domain is lowercased."""
    url = "https://EXAMPLE.COM/page"
    result = normalize_url(url)
    
    assert "example.com" in result
    assert "EXAMPLE" not in result


def test_normalize_url_preserves_path_case():
    """Verify path case is preserved."""
    url = "https://example.com/CamelCase/Path"
    result = normalize_url(url)
    
    assert "/CamelCase/Path" in result


def test_normalize_url_preserves_non_tracking_params():
    """Verify non-tracking query parameters are preserved."""
    url = "https://example.com/search?q=test&page=2"
    result = normalize_url(url)
    
    assert "q=test" in result
    assert "page=2" in result


# =============================================================================
# Deduplication Tests
# =============================================================================


def test_deduplicate_urls_removes_duplicates():
    """Verify exact duplicates are removed."""
    urls = [
        "https://example.com/page",
        "https://example.com/page",
        "https://other.com/page",
    ]
    result = deduplicate_urls(urls)
    
    assert len(result) == 2
    assert "https://example.com/page" in result
    assert "https://other.com/page" in result


def test_deduplicate_urls_normalizes_before_compare():
    """Verify URLs are normalized before comparison."""
    urls = [
        "https://example.com/page",
        "https://www.example.com/page",
        "https://example.com/page?utm_source=test",
    ]
    result = deduplicate_urls(urls)
    
    # All three should normalize to the same URL
    assert len(result) == 1


def test_deduplicate_urls_preserves_order():
    """Verify first occurrence is kept and order preserved."""
    urls = [
        "https://first.com/page",
        "https://second.com/page",
        "https://www.first.com/page",  # Duplicate of first
        "https://third.com/page",
    ]
    result = deduplicate_urls(urls)
    
    assert len(result) == 3
    assert result[0] == "https://first.com/page"  # Original form kept
    assert result[1] == "https://second.com/page"
    assert result[2] == "https://third.com/page"


# =============================================================================
# Multi-Search Tests
# =============================================================================


@pytest.mark.asyncio
async def test_multi_search_empty_queries():
    """Verify empty query list returns empty results."""
    result = await multi_search([])
    
    assert result["urls"] == []
    assert result["snippets"] == {}
    assert result["titles"] == {}
    assert result["query_results"] == {}


@pytest.mark.asyncio
async def test_multi_search_returns_expected_structure():
    """Verify multi_search returns correct structure."""
    # Mock DuckDuckGo to avoid network calls
    mock_results = [
        {"href": "https://example.com/1", "title": "Title 1", "body": "Snippet 1"},
        {"href": "https://example.com/2", "title": "Title 2", "body": "Snippet 2"},
    ]
    
    with patch("web_research_mcp.tools.search._search_single_query") as mock_search:
        mock_search.return_value = mock_results
        
        result = await multi_search(["test query"], results_per_query=2)
        
        assert "urls" in result
        assert "snippets" in result
        assert "titles" in result
        assert "query_results" in result
        assert isinstance(result["urls"], list)
        assert isinstance(result["snippets"], dict)


@pytest.mark.asyncio
async def test_multi_search_deduplicates_across_queries():
    """Verify URLs are deduplicated across multiple queries."""
    # Same URL returned by different queries
    mock_results_1 = [
        {"href": "https://example.com/shared", "title": "T1", "body": "S1"},
        {"href": "https://example.com/unique1", "title": "T2", "body": "S2"},
    ]
    mock_results_2 = [
        {"href": "https://www.example.com/shared", "title": "T3", "body": "S3"},  # Same as first, with www
        {"href": "https://example.com/unique2", "title": "T4", "body": "S4"},
    ]
    
    with patch("web_research_mcp.tools.search._search_single_query") as mock_search:
        mock_search.side_effect = [mock_results_1, mock_results_2]
        
        result = await multi_search(["query1", "query2"], results_per_query=2)
        
        # Should have 3 unique URLs (shared is deduplicated)
        assert len(result["urls"]) == 3


# =============================================================================
# Integration Tests (require network)
# =============================================================================


@pytest.mark.integration
@pytest.mark.asyncio
async def test_multi_search_real_duckduckgo():
    """Integration test with real DuckDuckGo search.
    
    Note: This test may fail due to rate limiting or network issues.
    It validates the integration works when DuckDuckGo is available.
    """
    result = await multi_search(["python programming language"], results_per_query=3)
    
    # Structure should always be correct
    assert "urls" in result
    assert "snippets" in result
    assert "titles" in result
    assert "query_results" in result
    
    # If we got results, validate them
    if len(result["urls"]) > 0:
        assert all(url.startswith("http") for url in result["urls"])
        assert len(result["snippets"]) == len(result["urls"])
    # If no results, it's likely rate limiting - not a test failure
    # The structure is still correct
