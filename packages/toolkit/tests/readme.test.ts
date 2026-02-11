import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// README lives at the monorepo root (two levels up from packages/toolkit/)
const README_PATH = join(__dirname, "..", "..", "..", "README.md");

describe("README", () => {
  // Arrange — load README once for all tests
  const readme = existsSync(README_PATH)
    ? readFileSync(README_PATH, "utf-8")
    : "";

  // POSITIVE: README exists and has substantial content
  it("exists and is non-empty", () => {
    // Act
    const exists = existsSync(README_PATH);
    const lineCount = readme.split("\n").length;
    // Assert
    expect(exists).toBe(true);
    expect(lineCount).toBeGreaterThan(50);
  });

  // POSITIVE: Documents the multi_search tool
  it("documents multi_search tool", () => {
    // Act & Assert
    expect(readme).toContain("multi_search");
  });

  // POSITIVE: Documents the fetch_pages tool
  it("documents fetch_pages tool", () => {
    // Act & Assert
    expect(readme).toContain("fetch_pages");
  });

  // POSITIVE: Documents Claude Code install command
  it("documents Claude Code install", () => {
    // Act & Assert
    expect(readme).toContain("install claude-code");
  });

  // POSITIVE: Documents OpenCode install command
  it("documents OpenCode install", () => {
    // Act & Assert
    expect(readme).toContain("install opencode");
  });

  // POSITIVE: Has MCP server JSON config example
  it("has MCP server config example", () => {
    // Act & Assert
    expect(readme).toContain("mcpServers");
  });

  // POSITIVE: Uses npx command (not uvx or pip)
  it("uses npx command", () => {
    // Act & Assert
    expect(readme).toContain("npx web-research-mcp");
  });

  // NEGATIVE: No references to Codex CLI (dropped platform)
  it("has no Codex references", () => {
    // Act & Assert
    expect(readme.toLowerCase()).not.toContain("codex");
  });

  // NEGATIVE: No references to Gemini CLI (dropped platform)
  it("has no Gemini references", () => {
    // Act & Assert
    expect(readme.toLowerCase()).not.toContain("gemini");
  });

  // NEGATIVE: No references to Python/pip/uvx (old implementation)
  it("has no Python references", () => {
    // Arrange
    const lower = readme.toLowerCase();
    // Act & Assert
    expect(lower).not.toContain("python");
    expect(lower).not.toContain("pip ");
    expect(lower).not.toContain("uvx");
    expect(lower).not.toContain("pyproject");
  });

  // POSITIVE: Documents both agents
  it("documents both agents", () => {
    // Act & Assert
    expect(readme).toContain("web-searcher");
    expect(readme).toContain("deep-researcher");
  });
});
