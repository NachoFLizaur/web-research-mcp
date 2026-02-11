import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

describe("Project Setup", () => {
  // POSITIVE: Verifies build output file exists at expected path
  it("build output exists", () => {
    // Arrange - no setup needed, checking file system
    // Act
    const exists = existsSync("dist/cli.js");
    // Assert
    expect(exists).toBe(true);
  });

  // POSITIVE: Verifies shebang line for CLI executability
  it("build output has shebang", () => {
    // Arrange
    const content = readFileSync("dist/cli.js", "utf-8");
    // Act & Assert
    expect(content.startsWith("#!/usr/bin/env node")).toBe(true);
  });

  // POSITIVE: Verifies bin entry exists for npx execution
  it("package.json has bin entry", () => {
    // Arrange
    const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
    // Act & Assert
    expect(pkg.bin["web-research-mcp"]).toBeDefined();
  });
});
