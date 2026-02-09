"""Tests for server skeleton - Task 02."""

import pytest
from web_research_mcp.server import server, list_tools, call_tool


def test_server_instance_exists():
    """Verify server instance is created."""
    assert server is not None
    assert server.name == "web-research-mcp"


@pytest.mark.asyncio
async def test_list_tools_returns_two_tools():
    """Verify list_tools returns exactly 2 tools."""
    tools = await list_tools()
    assert len(tools) == 2


@pytest.mark.asyncio
async def test_multi_search_tool_schema():
    """Verify multi_search tool has correct schema."""
    tools = await list_tools()
    multi_search = next((t for t in tools if t.name == "multi_search"), None)
    
    assert multi_search is not None
    assert "queries" in multi_search.inputSchema["properties"]
    assert multi_search.inputSchema["properties"]["queries"]["type"] == "array"
    assert "queries" in multi_search.inputSchema["required"]


@pytest.mark.asyncio
async def test_fetch_pages_tool_schema():
    """Verify fetch_pages tool has correct schema."""
    tools = await list_tools()
    fetch_pages = next((t for t in tools if t.name == "fetch_pages"), None)
    
    assert fetch_pages is not None
    assert "urls" in fetch_pages.inputSchema["properties"]
    assert fetch_pages.inputSchema["properties"]["urls"]["type"] == "array"
    assert "urls" in fetch_pages.inputSchema["required"]


@pytest.mark.asyncio
async def test_call_tool_multi_search():
    """Verify call_tool routes to multi_search correctly."""
    result = await call_tool("multi_search", {"queries": ["test query"]})
    
    assert len(result) == 1
    assert result[0].type == "text"
    # Placeholder returns dict with urls and snippets keys
    assert "urls" in result[0].text or "error" in result[0].text


@pytest.mark.asyncio
async def test_call_tool_fetch_pages():
    """Verify call_tool routes to fetch_pages correctly."""
    result = await call_tool("fetch_pages", {"urls": ["https://example.com"]})
    
    assert len(result) == 1
    assert result[0].type == "text"
    # Placeholder returns dict with contents and errors keys
    assert "contents" in result[0].text or "error" in result[0].text


@pytest.mark.asyncio
async def test_call_tool_unknown():
    """Verify unknown tool raises ValueError."""
    with pytest.raises(ValueError, match="Unknown tool"):
        await call_tool("unknown_tool", {})
