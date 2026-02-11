# web-research-mcp

MCP server for web research — search the web and extract content from pages. Includes pre-built AI agents for Claude Code and OpenCode.

## Features

- **MCP Server**: Two tools for web research (`multi_search` + `fetch_pages`)
- **Agent Toolkit**: Pre-built web-searcher and deep-researcher agents
- **Multi-Platform**: Install agents for Claude Code or OpenCode with one command

## Quick Start

### As MCP Server

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "web-research": {
      "command": "npx",
      "args": ["web-research-mcp"]
    }
  }
}
```

### Install Agents for Claude Code

```bash
npx web-research-mcp install claude-code
```

This creates:
- `.claude-plugin/plugin.json` — Plugin manifest
- `.mcp.json` — MCP server config
- `skills/web-search/SKILL.md` — Web search skill
- `skills/deep-research/SKILL.md` — Deep research skill
- `agents/web-searcher.md` — Quick web search agent
- `agents/deep-researcher.md` — Comprehensive research agent

### Install Agents for OpenCode

```bash
npx web-research-mcp install opencode
```

This creates:
- `.opencode/agents/web-searcher.md`
- `.opencode/agents/deep-researcher.md`
- `.opencode/skills/web-search/SKILL.md`
- `.opencode/skills/deep-research/SKILL.md`

Then add the MCP server to your `opencode.json`:

```json
{
  "mcpServers": {
    "web-research": {
      "command": "npx",
      "args": ["web-research-mcp"]
    }
  }
}
```

## Tools

### multi_search

Search the web using multiple queries via DuckDuckGo.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `queries` | `string[]` | *(required)* | Search queries to execute |
| `results_per_query` | `number` | `5` | Results per query |

**Returns:** Deduplicated URLs, snippets, titles, and per-query mapping.

### fetch_pages

Fetch and extract clean text from multiple web pages.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `urls` | `string[]` | *(required)* | URLs to fetch |
| `max_chars` | `number` | `15000` | Max characters per page |
| `timeout` | `number` | `30` | Timeout in seconds |

**Returns:** Extracted text content, titles, and errors per URL.

## Agents

The installer writes two agents and two skills. **Agents** are entry points that define a persona and workflow. **Skills** are reusable methodology docs that agents load on demand.

### web-searcher

Quick web search agent for finding URLs, snippets, and answers. Uses the `web-search` skill for search methodology.

### deep-researcher

Comprehensive research agent that:

1. Generates 10 diverse search queries from a research question
2. Searches all queries in parallel via `multi_search`
3. Fetches all returned URLs via `fetch_pages`
4. Synthesizes findings into a detailed report with citations

Uses the `deep-research` skill for its multi-phase research workflow.

## Architecture

```
web-research-mcp/
├── src/
│   ├── cli.ts                  # CLI entry point — routes to server or installer
│   ├── server/
│   │   ├── index.ts            # MCP server setup and tool registration
│   │   ├── tools/
│   │   │   ├── search.ts       # multi_search implementation
│   │   │   └── fetch.ts        # fetch_pages implementation
│   │   └── utils/
│   │       ├── content.ts      # HTML extraction (Readability + linkedom)
│   │       └── url.ts          # URL deduplication
│   └── installer/
│       ├── index.ts            # Platform router
│       ├── claude-code.ts      # Claude Code installer
│       ├── opencode.ts         # OpenCode installer
│       └── assembler.ts        # Template assembly (frontmatter + prompt body)
├── prompts/                    # Platform-agnostic prompt bodies
│   ├── agents/                 # Agent prompt content
│   └── skills/                 # Skill prompt content
└── templates/                  # Platform-specific frontmatter templates
    ├── claude-code/            # Claude Code YAML templates + config files
    └── opencode/               # OpenCode YAML templates
```

The installer assembles output files by combining a **frontmatter template** (from `templates/`) with a **prompt body** (from `prompts/`), replacing `{{placeholders}}` with agent/skill metadata. This keeps prompt content shared across platforms while allowing platform-specific configuration.

## Development

```bash
npm install
npm run build
npm run typecheck
npm test
```

The project uses [tsup](https://tsup.egoist.dev/) for bundling and [vitest](https://vitest.dev/) for testing.

## License

MIT
