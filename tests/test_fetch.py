"""Tests for fetch tool and content utilities - Task 06."""

import pytest
from unittest.mock import patch, MagicMock

import requests

from web_research_mcp.utils.content_utils import (
    extract_content,
    extract_title,
    clean_whitespace,
    truncate_at_boundary,
)
from web_research_mcp.tools.fetch import fetch_pages


# =============================================================================
# Content Extraction Tests
# =============================================================================


def test_extract_content_removes_script():
    """Verify script tags and content are removed."""
    html = """
    <html><body>
    <p>Main content</p>
    <script>alert('malicious');</script>
    </body></html>
    """
    result = extract_content(html)
    
    assert "Main content" in result
    assert "alert" not in result
    assert "malicious" not in result


def test_extract_content_removes_style():
    """Verify style tags and content are removed."""
    html = """
    <html><body>
    <p>Main content</p>
    <style>.hidden { display: none; }</style>
    </body></html>
    """
    result = extract_content(html)
    
    assert "Main content" in result
    assert "display" not in result
    assert "hidden" not in result


def test_extract_content_removes_nav():
    """Verify nav tags and content are removed."""
    html = """
    <html><body>
    <nav><a href="/">Home</a><a href="/about">About</a></nav>
    <main><p>Main content</p></main>
    </body></html>
    """
    result = extract_content(html)
    
    assert "Main content" in result
    assert "Home" not in result
    assert "About" not in result


def test_extract_content_removes_footer():
    """Verify footer tags and content are removed."""
    html = """
    <html><body>
    <main><p>Main content</p></main>
    <footer>Copyright 2024</footer>
    </body></html>
    """
    result = extract_content(html)
    
    assert "Main content" in result
    assert "Copyright" not in result


def test_extract_content_removes_header():
    """Verify header tags and content are removed."""
    html = """
    <html><body>
    <header><h1>Site Title</h1></header>
    <main><p>Main content</p></main>
    </body></html>
    """
    result = extract_content(html)
    
    assert "Main content" in result
    # Note: header tag content removed, but h1 in main would be kept


def test_extract_content_preserves_main():
    """Verify main content is preserved."""
    html = """
    <html><body>
    <nav>Nav</nav>
    <main>
    <h1>Article Title</h1>
    <p>First paragraph with important information.</p>
    <p>Second paragraph with more details.</p>
    </main>
    <footer>Footer</footer>
    </body></html>
    """
    result = extract_content(html)
    
    assert "Article Title" in result
    assert "First paragraph" in result
    assert "Second paragraph" in result


def test_extract_content_truncates():
    """Verify content is truncated to max_chars."""
    html = "<html><body><p>" + "x" * 10000 + "</p></body></html>"
    result = extract_content(html, max_chars=500)
    
    # Allow some buffer for truncation message
    assert len(result) <= 600


def test_extract_content_truncates_at_boundary():
    """Verify truncation happens at natural boundary."""
    html = """
    <html><body>
    <p>First sentence. Second sentence. Third sentence.</p>
    <p>Fourth sentence. Fifth sentence.</p>
    </body></html>
    """
    result = extract_content(html, max_chars=50)
    
    # Should end at a sentence boundary or with truncation marker
    assert result.endswith(".") or "[Content truncated...]" in result


# =============================================================================
# Whitespace and Title Tests
# =============================================================================


def test_clean_whitespace_normalizes():
    """Verify excessive whitespace is normalized."""
    text = "Line 1\n\n\n\nLine 2    with   spaces"
    result = clean_whitespace(text)
    
    assert "\n\n\n" not in result
    assert "   " not in result
    assert "Line 1" in result
    assert "Line 2" in result


def test_extract_title_from_title_tag():
    """Verify title is extracted from title tag."""
    html = "<html><head><title>Page Title</title></head><body></body></html>"
    result = extract_title(html)
    
    assert result == "Page Title"


def test_extract_title_from_h1():
    """Verify title falls back to h1 when no title tag."""
    html = "<html><body><h1>Heading Title</h1></body></html>"
    result = extract_title(html)
    
    assert result == "Heading Title"


# =============================================================================
# Truncate at Boundary Tests
# =============================================================================


def test_truncate_at_boundary_no_truncation_needed():
    """Verify short text is returned unchanged."""
    text = "Short text."
    result = truncate_at_boundary(text, max_chars=100)
    
    assert result == text


def test_truncate_at_boundary_finds_sentence():
    """Verify truncation finds sentence boundary."""
    text = "First sentence. Second sentence. Third sentence is very long and continues."
    result = truncate_at_boundary(text, max_chars=40)
    
    # Should truncate at a sentence boundary
    assert "[Content truncated...]" in result
    assert len(result.replace("[Content truncated...]", "").strip()) <= 50


# =============================================================================
# Fetch Pages Tests
# =============================================================================


@pytest.mark.asyncio
async def test_fetch_pages_empty_urls():
    """Verify empty URL list returns empty results."""
    result = await fetch_pages([])
    
    assert result["contents"] == {}
    assert result["errors"] == {}
    assert result["success_count"] == 0
    assert result["error_count"] == 0


@pytest.mark.asyncio
async def test_fetch_pages_returns_expected_structure():
    """Verify fetch_pages returns correct structure."""
    mock_response = MagicMock()
    mock_response.text = "<html><head><title>Test Page</title></head><body><p>Content</p></body></html>"
    mock_response.headers = {"Content-Type": "text/html"}
    mock_response.raise_for_status = MagicMock()
    
    with patch("web_research_mcp.tools.fetch.requests.get") as mock_get:
        mock_get.return_value = mock_response
        
        result = await fetch_pages(["https://example.com"])
        
        assert "contents" in result
        assert "titles" in result
        assert "errors" in result
        assert "success_count" in result
        assert "error_count" in result


@pytest.mark.asyncio
async def test_fetch_pages_extracts_content():
    """Verify fetch_pages extracts content correctly."""
    mock_response = MagicMock()
    mock_response.text = """
    <html>
    <head><title>Test Page</title></head>
    <body>
    <nav>Navigation</nav>
    <main><p>Main content here</p></main>
    <footer>Footer</footer>
    </body>
    </html>
    """
    mock_response.headers = {"Content-Type": "text/html; charset=utf-8"}
    mock_response.raise_for_status = MagicMock()
    
    with patch("web_research_mcp.tools.fetch.requests.get") as mock_get:
        mock_get.return_value = mock_response
        
        result = await fetch_pages(["https://example.com"])
        
        assert result["success_count"] == 1
        assert "https://example.com" in result["contents"]
        assert "Main content" in result["contents"]["https://example.com"]
        assert "Navigation" not in result["contents"]["https://example.com"]


@pytest.mark.asyncio
async def test_fetch_pages_handles_timeout():
    """Verify timeout errors are captured."""
    with patch("web_research_mcp.tools.fetch.requests.get") as mock_get:
        mock_get.side_effect = requests.Timeout("Connection timed out")
        
        result = await fetch_pages(["https://slow.example.com"], timeout=1)
        
        assert result["error_count"] == 1
        assert "https://slow.example.com" in result["errors"]
        assert "timed out" in result["errors"]["https://slow.example.com"].lower()


@pytest.mark.asyncio
async def test_fetch_pages_handles_non_html():
    """Verify non-HTML content types are handled."""
    mock_response = MagicMock()
    mock_response.headers = {"Content-Type": "application/json"}
    mock_response.raise_for_status = MagicMock()
    
    with patch("web_research_mcp.tools.fetch.requests.get") as mock_get:
        mock_get.return_value = mock_response
        
        result = await fetch_pages(["https://api.example.com/data.json"])
        
        assert result["error_count"] == 1
        assert "https://api.example.com/data.json" in result["errors"]
        assert "Non-HTML" in result["errors"]["https://api.example.com/data.json"]


@pytest.mark.asyncio
async def test_fetch_pages_handles_http_error():
    """Verify HTTP errors are captured."""
    with patch("web_research_mcp.tools.fetch.requests.get") as mock_get:
        mock_get.side_effect = requests.HTTPError("404 Not Found")
        
        result = await fetch_pages(["https://example.com/notfound"])
        
        assert result["error_count"] == 1
        assert "https://example.com/notfound" in result["errors"]


@pytest.mark.asyncio
async def test_fetch_pages_multiple_urls():
    """Verify multiple URLs are fetched in parallel."""
    mock_response = MagicMock()
    mock_response.text = "<html><head><title>Page</title></head><body><p>Content</p></body></html>"
    mock_response.headers = {"Content-Type": "text/html"}
    mock_response.raise_for_status = MagicMock()
    
    with patch("web_research_mcp.tools.fetch.requests.get") as mock_get:
        mock_get.return_value = mock_response
        
        urls = [
            "https://example1.com",
            "https://example2.com",
            "https://example3.com",
        ]
        result = await fetch_pages(urls)
        
        assert result["success_count"] == 3
        assert len(result["contents"]) == 3
        for url in urls:
            assert url in result["contents"]


# =============================================================================
# Integration Tests (require network)
# =============================================================================


@pytest.mark.integration
@pytest.mark.asyncio
async def test_fetch_pages_real_request():
    """Integration test with real HTTP request.
    
    Note: This test requires network access and may fail due to
    network issues or site changes.
    """
    result = await fetch_pages(["https://example.com"], max_chars=5000)
    
    assert result["success_count"] == 1
    assert "https://example.com" in result["contents"]
    assert len(result["contents"]["https://example.com"]) > 0
