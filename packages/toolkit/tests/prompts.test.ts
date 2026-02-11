import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

const PROMPT_FILES = [
  "prompts/agents/web-searcher.md",
  "prompts/agents/deep-researcher.md",
  "prompts/skills/web-search.md",
  "prompts/skills/deep-research.md",
];

function readPrompt(file: string): string {
  return readFileSync(file, "utf-8");
}

describe("Canonical Prompts", () => {
  // POSITIVE: Each prompt file exists and has content
  for (const file of PROMPT_FILES) {
    it(`${file} exists and is non-empty`, () => {
      // Arrange & Act
      const exists = existsSync(file);
      // Assert
      expect(exists).toBe(true);
      const content = readFileSync(file, "utf-8");
      expect(content.trim().length).toBeGreaterThan(0);
    });
  }

  // NEGATIVE: No prompt file starts with YAML frontmatter
  it("no prompt starts with frontmatter", () => {
    for (const file of PROMPT_FILES) {
      // Arrange
      const content = readPrompt(file);
      // Act & Assert
      expect(content.startsWith("---")).toBe(false);
    }
  });

  // POSITIVE: All prompts reference multi_search tool
  it("all prompts reference multi_search", () => {
    for (const file of PROMPT_FILES) {
      // Arrange
      const content = readPrompt(file);
      // Act & Assert
      expect(content).toContain("multi_search");
    }
  });

  // POSITIVE: All prompts reference fetch_pages tool
  it("all prompts reference fetch_pages", () => {
    for (const file of PROMPT_FILES) {
      // Arrange
      const content = readPrompt(file);
      // Act & Assert
      expect(content).toContain("fetch_pages");
    }
  });

  // POSITIVE: Tool names use the web-research_ prefix
  it("tool names use web-research_ prefix", () => {
    for (const file of PROMPT_FILES) {
      // Arrange
      const content = readPrompt(file);
      // Act & Assert
      expect(content).toContain("web-research_multi_search");
      expect(content).toContain("web-research_fetch_pages");
    }
  });

  // POSITIVE: Deep researcher has the 10-query workflow
  it("deep-researcher has 10-query workflow", () => {
    // Arrange
    const content = readPrompt("prompts/agents/deep-researcher.md");
    // Act & Assert
    expect(content).toContain("10");
    expect(content.toLowerCase()).toContain("quer");
  });

  // POSITIVE: Deep researcher has quality checklist
  it("deep-researcher has quality checklist", () => {
    // Arrange
    const content = readPrompt("prompts/agents/deep-researcher.md");
    // Act & Assert — look for checklist markers (checkbox syntax)
    expect(content).toContain("- [ ]");
  });

  // POSITIVE: Deep researcher has synthesis output format
  it("deep-researcher has synthesis format", () => {
    // Arrange
    const content = readPrompt("prompts/agents/deep-researcher.md");
    // Act & Assert
    expect(content).toContain("Executive Summary");
  });

  // NEGATIVE: No prompts reference codex or gemini (dropped platforms)
  it("no prompts reference codex or gemini", () => {
    for (const file of PROMPT_FILES) {
      // Arrange
      const content = readPrompt(file).toLowerCase();
      // Act & Assert
      expect(content).not.toContain("codex");
      expect(content).not.toContain("gemini");
    }
  });

  // NEGATIVE: No prompts have platform-specific content
  it("no prompts have platform-specific content", () => {
    for (const file of PROMPT_FILES) {
      // Arrange
      const content = readPrompt(file);
      // Act & Assert
      expect(content).not.toContain("Claude Code");
      expect(content).not.toContain("OpenCode");
    }
  });
});
