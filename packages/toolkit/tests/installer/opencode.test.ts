import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
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
const { installOpenCode } = await import("../../src/installer/opencode.js");
const { installClaudeCode } = await import("../../src/installer/claude-code.js");

describe("OpenCode Installer", () => {
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "test-opencode-"));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
  });

  // POSITIVE: Creates agent files in .opencode/agents/
  it("creates .opencode/agents/ files", async () => {
    // Act
    await installOpenCode();
    // Assert
    expect(
      existsSync(join(tempDir, ".opencode", "agents", "web-searcher.md")),
    ).toBe(true);
    expect(
      existsSync(join(tempDir, ".opencode", "agents", "deep-researcher.md")),
    ).toBe(true);
  });

  // POSITIVE: Creates skill files in .opencode/skills/
  it("creates .opencode/skills/ files", async () => {
    // Act
    await installOpenCode();
    // Assert
    expect(
      existsSync(
        join(tempDir, ".opencode", "skills", "web-search", "SKILL.md"),
      ),
    ).toBe(true);
    expect(
      existsSync(
        join(tempDir, ".opencode", "skills", "deep-research", "SKILL.md"),
      ),
    ).toBe(true);
  });

  // POSITIVE: Agent files have mode subagent
  it("agent files have mode subagent", async () => {
    // Act
    await installOpenCode();
    // Assert
    const content = readFileSync(
      join(tempDir, ".opencode", "agents", "web-searcher.md"),
      "utf-8",
    );
    expect(content).toContain("mode: subagent");
  });

  // POSITIVE: Agent files have tool patterns
  it("agent files have tool patterns", async () => {
    // Act
    await installOpenCode();
    // Assert
    const content = readFileSync(
      join(tempDir, ".opencode", "agents", "web-searcher.md"),
      "utf-8",
    );
    expect(content).toContain("web-research_*");
  });

  // NEGATIVE: Agent files have no remaining placeholders
  it("agent files have no remaining placeholders", async () => {
    // Act
    await installOpenCode();
    // Assert
    const files = [
      join(tempDir, ".opencode", "agents", "web-searcher.md"),
      join(tempDir, ".opencode", "agents", "deep-researcher.md"),
      join(tempDir, ".opencode", "skills", "web-search", "SKILL.md"),
      join(tempDir, ".opencode", "skills", "deep-research", "SKILL.md"),
    ];
    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      expect(content).not.toContain("{{");
    }
  });

  // POSITIVE: Prompt bodies match between platforms (canonical source)
  it("prompt bodies match between platforms", async () => {
    // Arrange — install OpenCode in current temp dir
    await installOpenCode();
    const openCodeAgentContent = readFileSync(
      join(tempDir, ".opencode", "agents", "web-searcher.md"),
      "utf-8",
    );

    // Create a second temp dir for Claude Code
    const claudeDir = mkdtempSync(join(tmpdir(), "test-claude-compare-"));
    process.chdir(claudeDir);
    await installClaudeCode();
    const claudeAgentContent = readFileSync(
      join(claudeDir, "agents", "web-searcher.md"),
      "utf-8",
    );

    // Extract body (everything after the second ---)
    const extractBody = (content: string): string => {
      const secondDash = content.indexOf("---", 4); // skip first ---
      return content.slice(secondDash + 3).trim();
    };

    const openCodeBody = extractBody(openCodeAgentContent);
    const claudeBody = extractBody(claudeAgentContent);

    // Assert — bodies should be identical (same canonical prompt source)
    expect(openCodeBody).toBe(claudeBody);
    expect(openCodeBody.length).toBeGreaterThan(0);

    // Cleanup the extra temp dir
    process.chdir(originalCwd);
    rmSync(claudeDir, { recursive: true, force: true });
    // Re-chdir to tempDir so afterEach cleanup works correctly
    process.chdir(tempDir);
  });

  // POSITIVE: Creates opencode.json when it doesn't exist
  it("creates opencode.json with correct MCP config", async () => {
    // Act
    await installOpenCode();
    // Assert
    const configPath = join(tempDir, "opencode.json");
    expect(existsSync(configPath)).toBe(true);
    const data = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(data.$schema).toBe("https://opencode.ai/config.json");
    expect(data.mcp["web-research"]).toEqual({
      type: "local",
      command: ["npx", "-y", "web-research-mcp"],
    });
  });

  // POSITIVE: Merges with existing opencode.json preserving other config
  it("merges MCP config into existing opencode.json", async () => {
    // Arrange — create an existing opencode.json with other settings
    const existingConfig = {
      $schema: "https://opencode.ai/config.json",
      provider: { name: "anthropic" },
      mcp: {
        "other-server": { type: "local", command: ["node", "other.js"] },
      },
    };
    writeFileSync(
      join(tempDir, "opencode.json"),
      JSON.stringify(existingConfig, null, 2),
    );
    // Act
    await installOpenCode();
    // Assert
    const data = JSON.parse(
      readFileSync(join(tempDir, "opencode.json"), "utf-8"),
    );
    // Existing config preserved
    expect(data.provider).toEqual({ name: "anthropic" });
    expect(data.mcp["other-server"]).toEqual({
      type: "local",
      command: ["node", "other.js"],
    });
    // New entry added
    expect(data.mcp["web-research"]).toEqual({
      type: "local",
      command: ["npx", "-y", "web-research-mcp"],
    });
  });

  // POSITIVE: OpenCode MCP config uses correct format (type: local, command as array)
  it("opencode.json uses OpenCode-native format", async () => {
    // Act
    await installOpenCode();
    // Assert
    const data = JSON.parse(
      readFileSync(join(tempDir, "opencode.json"), "utf-8"),
    );
    const entry = data.mcp["web-research"];
    // Must have type: "local"
    expect(entry.type).toBe("local");
    // Command must be an array (not string + args)
    expect(Array.isArray(entry.command)).toBe(true);
    expect(entry.command).toEqual(["npx", "-y", "web-research-mcp"]);
    // Must NOT have separate "args" field
    expect(entry.args).toBeUndefined();
  });
});
