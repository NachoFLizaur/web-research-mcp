/**
 * MCP Server — tool registration and request routing.
 *
 * Registers multi_search and fetch_pages tools and routes
 * incoming tool calls to the appropriate handler functions.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { multiSearch } from "./tools/search.js";
import { fetchPages } from "./tools/fetch.js";

export async function startServer(): Promise<void> {
  try {
    const server = new Server(
      { name: "web-research-mcp", version: "0.1.0" },
      { capabilities: { tools: {} } },
    );

    // List tools
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "multi_search",
          description:
            "Search the web using multiple queries via DuckDuckGo. Returns deduplicated URLs and snippets.",
          inputSchema: {
            type: "object" as const,
            properties: {
              queries: {
                type: "array",
                items: { type: "string" },
                description: "List of search queries to execute",
              },
              results_per_query: {
                type: "integer",
                default: 5,
                description: "Number of results per query (default: 5)",
              },
            },
            required: ["queries"],
          },
        },
        {
          name: "fetch_pages",
          description:
            "Fetch and extract content from multiple web pages in parallel.",
          inputSchema: {
            type: "object" as const,
            properties: {
              urls: {
                type: "array",
                items: { type: "string" },
                description: "List of URLs to fetch",
              },
              max_chars: {
                type: "integer",
                default: 15000,
                description: "Maximum characters per page (default: 15000)",
              },
              timeout: {
                type: "integer",
                default: 30,
                description: "Timeout in seconds per request (default: 30)",
              },
            },
            required: ["urls"],
          },
        },
      ],
    }));

    // Handle tool calls
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === "multi_search") {
        const result = await multiSearch(
          (args?.queries as string[]) ?? [],
          (args?.results_per_query as number) ?? 5,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "fetch_pages") {
        const result = await fetchPages(
          (args?.urls as string[]) ?? [],
          (args?.max_chars as number) ?? 15000,
          (args?.timeout as number) ?? 30,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      throw new Error(`Unknown tool: ${name}`);
    });

    // Start server
    const transport = new StdioServerTransport();
    await server.connect(transport);

    process.on("SIGINT", async () => {
      await transport.close();
      process.exit(0);
    });

    process.stderr.write("web-research-mcp server running on stdio\n");

    // Handle uncaught errors to prevent the process from crashing.
    // In stdio MCP mode, an unhandled error would kill the server process,
    // which the client sees as "Connection closed".
    process.on("uncaughtException", (error) => {
      process.stderr.write(`Uncaught exception: ${error.message}\n`);
    });

    process.on("unhandledRejection", (reason) => {
      process.stderr.write(
        `Unhandled rejection: ${reason instanceof Error ? reason.message : String(reason)}\n`,
      );
    });
  } catch (error) {
    process.stderr.write(
      `Failed to start server: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1);
  }
}
