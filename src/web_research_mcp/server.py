"""Web Research MCP Server - Main entry point."""

import asyncio
import logging
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create the MCP server instance
server = Server("web-research-mcp")


@server.list_tools()
async def list_tools() -> list[Tool]:
    """List available tools."""
    return [
        Tool(
            name="multi_search",
            description="Search the web using multiple queries via DuckDuckGo. Returns deduplicated URLs and snippets.",
            inputSchema={
                "type": "object",
                "properties": {
                    "queries": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of search queries to execute",
                    },
                    "results_per_query": {
                        "type": "integer",
                        "default": 5,
                        "description": "Number of results per query (default: 5)",
                    },
                },
                "required": ["queries"],
            },
        ),
        Tool(
            name="fetch_pages",
            description="Fetch and extract content from multiple web pages in parallel.",
            inputSchema={
                "type": "object",
                "properties": {
                    "urls": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of URLs to fetch",
                    },
                    "max_chars": {
                        "type": "integer",
                        "default": 15000,
                        "description": "Maximum characters per page (default: 15000)",
                    },
                    "timeout": {
                        "type": "integer",
                        "default": 30,
                        "description": "Timeout in seconds per request (default: 30)",
                    },
                },
                "required": ["urls"],
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls."""
    logger.info(f"Tool called: {name} with arguments: {arguments}")
    
    if name == "multi_search":
        # Import here to avoid circular imports
        from web_research_mcp.tools.search import multi_search
        result = await multi_search(
            queries=arguments["queries"],
            results_per_query=arguments.get("results_per_query", 5),
        )
        return [TextContent(type="text", text=str(result))]
    
    elif name == "fetch_pages":
        from web_research_mcp.tools.fetch import fetch_pages
        result = await fetch_pages(
            urls=arguments["urls"],
            max_chars=arguments.get("max_chars", 15000),
            timeout=arguments.get("timeout", 30),
        )
        return [TextContent(type="text", text=str(result))]
    
    else:
        raise ValueError(f"Unknown tool: {name}")


async def run_server():
    """Run the MCP server with stdio transport."""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


def main():
    """Entry point for the MCP server."""
    asyncio.run(run_server())


if __name__ == "__main__":
    main()
