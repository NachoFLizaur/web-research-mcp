<div align="center">

# Web Research

**A web research toolkit for AI coding assistants — search, extract, and synthesize with pre-built agents.**

No API keys. One command to install. Works with Claude Code and OpenCode.

[![npm: web-research-toolkit](https://img.shields.io/npm/v/web-research-toolkit?label=web-research-toolkit)](https://www.npmjs.com/package/web-research-toolkit)
[![npm: web-research-mcp](https://img.shields.io/npm/v/web-research-mcp?label=web-research-mcp)](https://www.npmjs.com/package/web-research-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/NachoFLizaur/web-research/blob/main/LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org)

</div>

---

## Table of Contents

- [Quick Start](#quick-start)
- [What's Included](#whats-included)
- [Agents & Skills](#agents--skills)
- [MCP Tools](#mcp-tools)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## Quick Start

Install agents and skills for your platform:

```bash
npx web-research-toolkit install claude-code
```

or

```bash
npx web-research-toolkit install opencode
```

That's it. The installer configures the MCP server, installs agents, and sets up skills — no separate setup needed.

<details>
<summary><strong>Just want the MCP server?</strong></summary>

If you only need the search and fetch tools (without agents), add the server to your MCP client config directly:

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

</details>

---

## What's Included

This monorepo ships two npm packages:

| Package | Description |
|---------|-------------|
| [`web-research-mcp`](https://www.npmjs.com/package/web-research-mcp) | MCP server with two tools: `multi_search` (DuckDuckGo) and `fetch_pages` (parallel content extraction) |
| [`web-research-toolkit`](https://www.npmjs.com/package/web-research-toolkit) | Installs pre-built AI agents and skills into your project for Claude Code or OpenCode |

---

## Agents & Skills

The toolkit installs **agents** (autonomous subagents with defined workflows) and **skills** (on-demand expertise that agents load when needed).

**Agents:**

- **`web-searcher`** — Quick web search. Runs a few targeted queries and returns URLs, snippets, or direct answers.
- **`deep-researcher`** — Comprehensive multi-source research. Expands a question into 10 diverse queries, fetches every result, and synthesizes a detailed report with citations.

**Skills:**

- **`web-search`** — Search methodology and result handling
- **`deep-research`** — Multi-phase research workflow

See the [`web-research-toolkit` README](https://www.npmjs.com/package/web-research-toolkit) for full details on each agent and skill.

---

## MCP Tools

The MCP server provides two tools for AI assistants:

- **`multi_search`** — Search DuckDuckGo with multiple queries in parallel. Returns deduplicated URLs, snippets, and titles.
- **`fetch_pages`** — Fetch and extract clean text from multiple web pages in parallel. Uses Mozilla Readability for content extraction.

No API keys required. Works with any MCP-compatible client.

See the [`web-research-mcp` README](https://www.npmjs.com/package/web-research-mcp) for tool parameters and examples.

---

## Development

```bash
npm install          # install all workspace deps
npm run build        # build both packages
npm test             # test both packages
npm run typecheck    # type check both packages
```

Monorepo structure:

```
packages/
├── mcp/       # web-research-mcp — MCP server
└── toolkit/   # web-research-toolkit — agent installer
```

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

## License

[MIT](https://github.com/NachoFLizaur/web-research/blob/main/LICENSE) © Nacho F. Lizaur
