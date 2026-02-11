import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

const TEMPLATE_FILES = [
  "templates/claude-code/agent.yaml",
  "templates/claude-code/skill.yaml",
  "templates/claude-code/plugin.json",
  "templates/claude-code/mcp.json",
  "templates/opencode/agent.yaml",
  "templates/opencode/skill.yaml",
];

function readTemplate(file: string): string {
  return readFileSync(file, "utf-8");
}

describe("Frontmatter Templates", () => {
  describe("Claude Code", () => {
    // POSITIVE: agent.yaml exists and has required placeholders
    it("agent.yaml has placeholders and mcpServers", () => {
      // Arrange
      const content = readTemplate("templates/claude-code/agent.yaml");
      // Act & Assert
      expect(content).toContain("{{name}}");
      expect(content).toContain("{{description}}");
      expect(content).toContain("mcpServers");
      expect(content).toContain("npx");
    });

    // POSITIVE: agent.yaml uses npx web-research-mcp command
    it("agent.yaml has npx web-research-mcp command", () => {
      // Arrange
      const content = readTemplate("templates/claude-code/agent.yaml");
      // Act & Assert
      expect(content).toContain("npx");
      expect(content).toContain("web-research-mcp");
    });

    // POSITIVE: skill.yaml exists and has required placeholders
    it("skill.yaml has placeholders", () => {
      // Arrange
      const content = readTemplate("templates/claude-code/skill.yaml");
      // Act & Assert
      expect(content).toContain("{{name}}");
      expect(content).toContain("{{description}}");
    });

    // POSITIVE: plugin.json is valid JSON
    it("plugin.json is valid JSON", () => {
      // Arrange
      const content = readTemplate("templates/claude-code/plugin.json");
      // Act & Assert — JSON.parse will throw if invalid
      expect(() => JSON.parse(content)).not.toThrow();
    });

    // POSITIVE: plugin.json has required fields
    it("plugin.json has required fields", () => {
      // Arrange
      const data = JSON.parse(
        readTemplate("templates/claude-code/plugin.json"),
      );
      // Act & Assert
      expect(data.name).toBeDefined();
      expect(data.description).toBeDefined();
      expect(data.skills).toBeInstanceOf(Array);
      expect(data.agents).toBeInstanceOf(Array);
    });

    // POSITIVE: mcp.json is valid JSON
    it("mcp.json is valid JSON", () => {
      // Arrange
      const content = readTemplate("templates/claude-code/mcp.json");
      // Act & Assert
      expect(() => JSON.parse(content)).not.toThrow();
    });

    // POSITIVE: mcp.json has server config with npx -y command
    it("mcp.json has server config", () => {
      // Arrange
      const data = JSON.parse(readTemplate("templates/claude-code/mcp.json"));
      // Act & Assert
      expect(data.mcpServers).toBeDefined();
      expect(data.mcpServers["web-research"]).toBeDefined();
      expect(data.mcpServers["web-research"].command).toBe("npx");
      expect(data.mcpServers["web-research"].args).toEqual(
        ["-y", "web-research-mcp"],
      );
    });
  });

  describe("OpenCode", () => {
    // POSITIVE: agent.yaml has mode subagent
    it("agent.yaml has mode subagent", () => {
      // Arrange
      const content = readTemplate("templates/opencode/agent.yaml");
      // Act & Assert
      expect(content).toContain("mode: subagent");
    });

    // POSITIVE: agent.yaml has tool patterns for web-research MCP
    it("agent.yaml has tool patterns", () => {
      // Arrange
      const content = readTemplate("templates/opencode/agent.yaml");
      // Act & Assert
      expect(content).toContain("web-research_*");
    });

    // POSITIVE: agent.yaml has description placeholder
    it("agent.yaml has description placeholder", () => {
      // Arrange
      const content = readTemplate("templates/opencode/agent.yaml");
      // Act & Assert
      expect(content).toContain("{{description}}");
    });

    // POSITIVE: skill.yaml exists and has description placeholder
    it("skill.yaml has description placeholder", () => {
      // Arrange
      const content = readTemplate("templates/opencode/skill.yaml");
      // Act & Assert
      expect(content).toContain("{{description}}");
    });
  });

  describe("Cross-platform checks", () => {
    // NEGATIVE: No templates reference uvx (should be npx)
    it("no templates reference uvx", () => {
      for (const file of TEMPLATE_FILES) {
        // Arrange
        const content = readTemplate(file);
        // Act & Assert
        expect(content).not.toContain("uvx");
      }
    });

    // NEGATIVE: No templates reference codex or gemini
    it("no templates reference codex or gemini", () => {
      for (const file of TEMPLATE_FILES) {
        // Arrange
        const content = readTemplate(file).toLowerCase();
        // Act & Assert
        expect(content).not.toContain("codex");
        expect(content).not.toContain("gemini");
      }
    });

    // POSITIVE: All template files exist
    it("all template files exist", () => {
      for (const file of TEMPLATE_FILES) {
        // Arrange & Act
        const exists = existsSync(file);
        // Assert
        expect(exists).toBe(true);
      }
    });

    // POSITIVE: Placeholder syntax is consistent ({{variable}})
    it("placeholder syntax is consistent", () => {
      // Arrange — check YAML templates that should have placeholders
      const yamlTemplates = TEMPLATE_FILES.filter((f) => f.endsWith(".yaml"));
      // Act & Assert
      for (const file of yamlTemplates) {
        const content = readTemplate(file);
        expect(content).toContain("{{description}}");
        // Verify no other placeholder styles (e.g., ${var}, %var%, <var>)
        expect(content).not.toMatch(/\$\{[a-z]+\}/);
        expect(content).not.toMatch(/%[a-z]+%/);
      }
    });
  });
});
