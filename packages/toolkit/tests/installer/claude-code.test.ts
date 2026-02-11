import {
  mkdtempSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// The project root where prompts/ and templates/ live
const PROJECT_ROOT = process.cwd();

// Mock readBundledFile to resolve from the actual project root
// (In test env, import.meta.url resolves to src/, not the project root)
vi.mock("../../src/installer/assembler.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/installer/assembler.js")>();
  return {
    ...actual,
    readBundledFile: (relativePath: string) => {
      const fullPath = join(PROJECT_ROOT, relativePath);
      return readFileSync(fullPath, "utf-8");
    },
  };
});

// Import after mock setup
const { installClaudeCode } = await import("../../src/installer/claude-code.js");

describe("Claude Code Installer", () => {
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "test-claude-"));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  // POSITIVE: Creates .claude-plugin/plugin.json
  it("creates .claude-plugin/plugin.json", async () => {
    // Act
    await installClaudeCode();
    // Assert
    const pluginPath = join(tempDir, ".claude-plugin", "plugin.json");
    expect(existsSync(pluginPath)).toBe(true);
    const content = readFileSync(pluginPath, "utf-8");
    expect(() => JSON.parse(content)).not.toThrow();
    const data = JSON.parse(content);
    expect(data.name).toBeDefined();
  });

  // POSITIVE: Creates .mcp.json with mcpServers
  it("creates .mcp.json", async () => {
    // Act
    await installClaudeCode();
    // Assert
    const mcpPath = join(tempDir, ".mcp.json");
    expect(existsSync(mcpPath)).toBe(true);
    const content = readFileSync(mcpPath, "utf-8");
    const data = JSON.parse(content);
    expect(data.mcpServers).toBeDefined();
  });

  // POSITIVE: Creates skill files
  it("creates skill files", async () => {
    // Act
    await installClaudeCode();
    // Assert
    expect(
      existsSync(join(tempDir, "skills", "web-search", "SKILL.md")),
    ).toBe(true);
    expect(
      existsSync(join(tempDir, "skills", "deep-research", "SKILL.md")),
    ).toBe(true);
  });

  // POSITIVE: Creates agent files
  it("creates agent files", async () => {
    // Act
    await installClaudeCode();
    // Assert
    expect(existsSync(join(tempDir, "agents", "web-searcher.md"))).toBe(true);
    expect(existsSync(join(tempDir, "agents", "deep-researcher.md"))).toBe(
      true,
    );
  });

  // POSITIVE: Agent files have frontmatter
  it("agent files have frontmatter", async () => {
    // Act
    await installClaudeCode();
    // Assert
    const agentContent = readFileSync(
      join(tempDir, "agents", "web-searcher.md"),
      "utf-8",
    );
    expect(agentContent.startsWith("---\n")).toBe(true);
    expect(agentContent).toContain("\n---\n");
  });

  // NEGATIVE: Agent files have no remaining placeholders
  it("agent files have no remaining placeholders", async () => {
    // Act
    await installClaudeCode();
    // Assert
    const files = [
      join(tempDir, "agents", "web-searcher.md"),
      join(tempDir, "agents", "deep-researcher.md"),
      join(tempDir, "skills", "web-search", "SKILL.md"),
      join(tempDir, "skills", "deep-research", "SKILL.md"),
    ];
    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      expect(content).not.toContain("{{");
    }
  });

  // POSITIVE: mcp.json uses npx command with -y flag
  it("mcp.json uses npx command with -y flag", async () => {
    // Act
    await installClaudeCode();
    // Assert
    const mcpContent = readFileSync(join(tempDir, ".mcp.json"), "utf-8");
    const data = JSON.parse(mcpContent);
    expect(data.mcpServers["web-research"].command).toBe("npx");
    expect(data.mcpServers["web-research"].args).toEqual(["-y", "web-research-mcp"]);
  });
});
