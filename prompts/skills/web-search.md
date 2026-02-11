# Web Search Expertise

This skill teaches you how to use the web-research MCP tools effectively for quick, targeted web searches.

## Available Tools

### `web-research_multi_search`
Searches DuckDuckGo with one or more queries in parallel. Returns deduplicated URLs with titles and snippets.

**Parameters:**
- `queries` (required): Array of search query strings
- `results_per_query` (optional): Number of results per query (default: 5)

**Returns:** Array of search results, each with `url`, `title`, and `snippet`.

### `web-research_fetch_pages`
Fetches and extracts readable content from multiple URLs in parallel.

**Parameters:**
- `urls` (required): Array of URLs to fetch
- `max_chars` (optional): Maximum characters to extract per page (default: 10000)
- `timeout` (optional): Timeout in seconds per request (default: 15)

**Returns:** Array of page results, each with `url`, `title`, and `content` (or `error` if fetch failed).

## Formulating Effective Queries

### Search Operators
- `"exact phrase"` - Match exact words in order
- `site:example.com` - Restrict to a specific domain
- `-unwanted` - Exclude a term from results
- `filetype:pdf` - Find specific file types
- `intitle:keyword` - Term must appear in page title

### Query Tips
- Be specific: `"React useEffect cleanup"` beats `React hooks`
- Add the year for current info: `best CI/CD tools 2025`
- Use site: for authoritative sources: `site:docs.python.org asyncio`
- Combine operators: `site:github.com "docker-compose" filetype:yml`

## When to Search vs Fetch

| Scenario | Action |
|----------|--------|
| Need a quick fact or URL | Search only - snippets are enough |
| Need detailed content from a page | Search, then fetch top 2-3 results |
| Need to compare information across sources | Search, then fetch 3-5 results |
| Comprehensive research | Use the deep-research skill instead |

## Best Practices

1. **Start with 1-2 queries** - Don't over-search for simple questions
2. **Read snippets first** - They often contain the answer without needing to fetch
3. **Fetch selectively** - Only fetch pages that look relevant from their title and snippet
4. **Cite your sources** - Always include URLs when presenting information from search results
5. **Note freshness** - Check dates on results; prefer recent sources for fast-moving topics
6. **Retry with refinement** - If first search is poor, refine the query once before giving up

## Example Usage

**Task**: Find the current LTS version of Node.js

1. Search: `web-research_multi_search` with `["Node.js current LTS version 2025"]`
2. Snippets likely contain the answer directly
3. Respond with the version and a link to the official source

**Task**: Find documentation for a specific API

1. Search: `web-research_multi_search` with `["site:docs.example.com API endpoint name"]`
2. Fetch the most relevant result for full documentation content
3. Summarize the key details with a link to the docs
